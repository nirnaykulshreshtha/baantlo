import random
import time
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from redis import Redis
from ....core.redis import get_redis
from ....core.config import settings
from ..schemas import OTPRequest, OTPVerifyRequest
from ....tasks.notify import send_sms_otp
from sqlalchemy.orm import Session
from ....db.deps import get_db
from ....db.models import User, RefreshToken
from ..errors import RATE_LIMITED, INVALID_OTP, USER_NOT_FOUND

logger = logging.getLogger(__name__)
from ....auth.flow import compute_next_action
from ....auth.rbac import get_platform_permissions_for_roles
from ....auth.tokens import create_access_token, create_refresh_token
from ....auth.responses import create_token_response
from ....auth.utils import (
    check_rate_limit, increment_metrics, log_auth_operation, 
    handle_verification_flow, create_rate_limit_key, mask_phone,
    RateLimitConfig
)


router = APIRouter()


def _rate_key(phone: str) -> str:
    return f"otp:rate:{phone}"


def _otp_key(phone: str) -> str:
    return f"otp:{phone}"


def _canonical_phone(p: str) -> str:
    if not isinstance(p, str):
        p = str(p)
    s = p.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    return s


@router.post("/request-otp")
def request_otp(body: OTPRequest, r: Redis = Depends(get_redis), db: Session = Depends(get_db)) -> dict:
    """
    Request SMS OTP for phone verification.
    
    Sends an OTP code to the user's phone for verification.
    If phone is already verified, returns next action without sending.
    """
    import time
    start_time = time.time()
    
    # Increment metrics
    increment_metrics(r, "metrics:otp:sms_otp_request")
    
    # Check if user exists with this phone number
    phone = _canonical_phone(body.phone)
    user = db.query(User).filter(User.phone.in_([body.phone, phone])).first()
    if not user:
        log_auth_operation("request_otp", phone=body.phone, success=False, reason="user_not_found")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=USER_NOT_FOUND)
    
    # Check if phone is already verified
    if user.phone_verified:
        # Phone is already verified, return next action
        action = compute_next_action(user, attempted_login=False)
        masked_phone = mask_phone(phone)
        log_auth_operation("request_otp", user_id=user.id, phone=body.phone, 
                          success=True, reason="already_verified")
        return {
            "sent": False,
            "message": "Phone number is already verified",
            "phone_masked": masked_phone,
            "action": action.value
        }
    
    # Check rate limiting using sliding window
    rk = _rate_key(phone)
    now = int(time.time())
    r.zremrangebyscore(rk, 0, now - RateLimitConfig.OTP_WINDOW)
    
    if r.zcard(rk) >= RateLimitConfig.OTP_MAX_ATTEMPTS:
        oldest = r.zrange(rk, 0, 0, withscores=True)
        reset_in = 0
        if oldest and len(oldest[0]) == 2:
            oldest_ts = int(oldest[0][1])
            reset_in = max(0, (oldest_ts + RateLimitConfig.OTP_WINDOW) - now)
        increment_metrics(r, "metrics:auth:rate_limit_hits")
        log_auth_operation("request_otp", phone=body.phone, success=False, reason="rate_limited")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS, 
            detail={"error": RATE_LIMITED, "retry_in": reset_in}
        )
    
    # Generate and store OTP
    code = f"{random.randint(100000, 999999)}"
    r.setex(_otp_key(phone), settings.otp_ttl_seconds, code)
    r.zadd(rk, {str(now): now})
    r.expire(rk, RateLimitConfig.OTP_WINDOW)
    
    # Send OTP SMS
    try:
        send_sms_otp.delay(body.phone, code)
        increment_metrics(r, "metrics:otp:sms_otp_send")
    except Exception as e:
        logger.exception("sms_otp_send_failed phone=%s", body.phone)
    
    # Prepare response
    remaining_calls = max(0, RateLimitConfig.OTP_MAX_ATTEMPTS - int(r.zcard(rk)))
    ttl_candidates = r.zrange(rk, 0, 0, withscores=True)
    cooldown = 0
    if ttl_candidates and len(ttl_candidates[0]) == 2:
        oldest_ts = int(ttl_candidates[0][1])
        cooldown = max(0, (oldest_ts + RateLimitConfig.OTP_WINDOW) - now)
    
    masked_phone = mask_phone(phone)
    payload: dict[str, object] = {
        "sent": True, 
        "cooldown_seconds": cooldown, 
        "remaining_requests": remaining_calls, 
        "phone_masked": masked_phone
    }
    
    if settings.environment != "production":
        payload["debug_code"] = code
    
    duration = time.time() - start_time
    log_auth_operation("request_otp", phone=body.phone, duration=duration, success=True)
    
    return payload


@router.post("/verify-otp")
def verify_otp(body: OTPVerifyRequest, r: Redis = Depends(get_redis), db: Session = Depends(get_db)) -> dict:
    """
    Verify phone using OTP code.
    
    Verifies the user's phone number using the OTP code sent via SMS.
    If all verifications are complete, issues tokens for auto-login.
    """
    import time
    start_time = time.time()
    
    phone = _canonical_phone(body.phone)
    
    # Get and validate OTP
    stored = r.get(_otp_key(phone))
    if isinstance(stored, (bytes, bytearray)):
        try:
            stored = stored.decode()
        except Exception:
            stored = str(stored)
    
    if not stored or stored != body.code:
        increment_metrics(r, "metrics:otp:sms_otp_invalid")
        log_auth_operation("verify_otp", phone=body.phone, success=False, reason="invalid_otp")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=INVALID_OTP)
    
    # Clean up OTP and mark as verified
    r.delete(_otp_key(phone))
    r.setex(f"otp:verified:{phone}", settings.otp_ttl_seconds, "1")
    
    # Find user
    user = db.query(User).filter(User.phone.in_([body.phone, phone])).first()
    if not user:
        log_auth_operation("verify_otp", phone=body.phone, success=False, reason="user_not_found")
        return {"action": "do_login"}
    
    # Mark phone as verified if not already
    if not user.phone_verified:
        user.phone_verified = True
        db.add(user)
        db.commit()
        increment_metrics(r, "metrics:otp:sms_otp_verify_success")
    
    # Check if all verifications are complete for auto-login
    if user.email_verified and (not user.phone or user.phone_verified):
        # All verifications complete - issue tokens for auto-login
        response = create_token_response(user, db, phone=body.phone, response_format="session")
        duration = time.time() - start_time
        log_auth_operation("verify_otp", user_id=user.id, phone=body.phone, 
                          duration=duration, success=True, auto_login=True)
        return response
    
    # Return verification flow response
    response = handle_verification_flow(user, db, attempted_login=False)
    response["phone"] = body.phone  # Use the original phone format
    
    duration = time.time() - start_time
    log_auth_operation("verify_otp", user_id=user.id, phone=body.phone, 
                      duration=duration, success=True)
    
    return response

