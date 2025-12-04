from datetime import datetime, timezone
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Body, Request
import logging
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from ....db.deps import get_db
from ....db.models import User, RefreshToken
from ....auth.tokens import decode_token, create_access_token, create_refresh_token
from ....auth.responses import create_token_response
from ....auth.rbac import get_platform_permissions_for_roles
import pathlib
import json
from ....auth.utils import (
    check_rate_limit, increment_metrics, log_auth_operation, 
    handle_verification_flow, create_rate_limit_key, mask_email,
    RateLimitConfig
)
from ....core.config import settings
from ....core.redis import get_redis
from redis import Redis
from ....core.security import hash_password, verify_password
try:
    from google.oauth2 import id_token as google_id_token
    from google.auth.transport import requests as google_requests
except Exception:  # pragma: no cover
    google_id_token = None  # type: ignore
    google_requests = None  # type: ignore
import requests
import jwt
from ....tasks.notify import send_email_verify, send_password_reset, send_email_otp
from ....auth.flow import NextAction, compute_next_action
from ..errors import (
    INVALID_CREDENTIALS,
    EMAIL_NOT_VERIFIED,
    PHONE_NOT_VERIFIED,
    USER_NOT_FOUND,
    CONSTRAINT_VIOLATION,
    EMAIL_IN_USE,
    PHONE_IN_USE,
    TOKEN_INVALID,
    TOKEN_EXPIRED_OR_REVOKED,
    MISSING_REFRESH_TOKEN,
    MISSING_TOKEN,
    MISSING_CLIENT_ID,
    INVALID_ID_TOKEN,
    INVALID_OTP,
    RATE_LIMITED,
    DATABASE_ERROR,
)


router = APIRouter()
logger = logging.getLogger(__name__)


from ..schemas import RegisterRequest, LoginRequest, TokenResponse, ForgotPasswordRequest, ResetPasswordRequest, EmailOTPRequest, EmailOTPVerifyRequest


@router.post("/token", response_model=TokenResponse)
def issue_token(body: LoginRequest, db: Session = Depends(get_db), r: Redis = Depends(get_redis)) -> dict[str, Any]:
    """
    Issue authentication tokens for valid credentials.
    
    This endpoint provides a simplified login flow that directly issues tokens
    for users with verified email and phone (if applicable).
    """
    import time
    start_time = time.time()
    
    # Increment metrics
    increment_metrics(r, "metrics:auth:login_attempts")
    
    # Check rate limiting
    rate_key = create_rate_limit_key("login", body.email)
    is_allowed, count, remaining = check_rate_limit(
        r, rate_key, RateLimitConfig.LOGIN_WINDOW, 
        RateLimitConfig.LOGIN_MAX_ATTEMPTS, "login"
    )
    
    if not is_allowed:
        increment_metrics(r, "metrics:auth:rate_limit_hits")
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=RATE_LIMITED)
    
    # Validate credentials
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.hashed_password):
        log_auth_operation("token_issue", email=body.email, success=False)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=INVALID_CREDENTIALS)
    
    # Check verification status and return next action if needed
    if not user.email_verified or (user.phone and not user.phone_verified):
        action = compute_next_action(user, attempted_login=True)
        response = {
            "action": action.value,
            "email": user.email,
            "phone": user.phone or "",
            "message": f"Login requires additional action: {action.value}"
        }
        log_auth_operation("token_issue", user_id=user.id, email=body.email, 
                          success=False, action=action.value)
        return response
    
    # Issue tokens
    response = create_token_response(user, db, response_format="session")
    increment_metrics(r, "metrics:auth:token_issue_success")
    
    duration = time.time() - start_time
    log_auth_operation("token_issue", user_id=user.id, email=body.email, 
                      duration=duration, success=True)
    
    return response


@router.post("/register")
def register(body: RegisterRequest, request: Request, db: Session = Depends(get_db), r: Redis = Depends(get_redis)) -> dict[str, Any]:
    """
    Register a new user account.
    
    Creates a new user account and initiates the verification flow.
    If phone verification was completed during registration, it's automatically applied.
    """
    import time
    start_time = time.time()
    
    # Increment metrics
    increment_metrics(r, "metrics:auth:register_attempts")
    
    # Check rate limiting
    client_ip = request.client.host if request.client else "unknown"
    email_key = create_rate_limit_key("register", body.email)
    ip_key = create_rate_limit_key("register", client_ip, scope="ip")

    email_allowed, email_count, _ = check_rate_limit(
        r, email_key, RateLimitConfig.REGISTER_WINDOW,
        RateLimitConfig.REGISTER_MAX_ATTEMPTS, "register_email"
    )
    ip_allowed, ip_count, _ = check_rate_limit(
        r, ip_key, RateLimitConfig.REGISTER_WINDOW,
        RateLimitConfig.REGISTER_MAX_ATTEMPTS_PER_IP, "register_ip"
    )
    
    if not email_allowed or not ip_allowed:
        increment_metrics(r, "metrics:auth:rate_limit_hits")
        logger.warning(
            "auth.register_rate_limited email=%s ip=%s email_count=%s ip_count=%s",
            body.email,
            client_ip,
            email_count,
            ip_count,
        )
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=RATE_LIMITED)
    
    # Check for existing users
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        log_auth_operation("register", email=body.email, success=False, reason="email_in_use")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=EMAIL_IN_USE)
    
    if body.phone:
        existing_phone = db.query(User).filter(User.phone == body.phone).first()
        if existing_phone:
            log_auth_operation("register", email=body.email, success=False, reason="phone_in_use")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=PHONE_IN_USE)
    
    # Create user
    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        display_name=body.display_name,
        phone=body.phone,
        preferred_currency=body.preferred_currency or "INR",
    )
    db.add(user)
    
    try:
        db.commit()
        increment_metrics(r, "metrics:auth:register_success")
    except IntegrityError as e:
        db.rollback()
        msg = str(e.orig)
        if "phone" in msg or "ix_users_phone" in msg:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=PHONE_IN_USE)
        if "email" in msg or "ix_users_email" in msg:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=EMAIL_IN_USE)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=CONSTRAINT_VIOLATION)
    
    # Check if phone was pre-verified during registration
    if body.phone:
        from .otp import _canonical_phone
        canon = _canonical_phone(body.phone)
        pv = r.get(f"phone:verified:{body.phone}") or r.get(f"otp:verified:{body.phone}") or r.get(f"otp:verified:{canon}")
        if pv and not user.phone_verified:
            user.phone_verified = True
            db.add(user)
            db.commit()
    
    # Send email verification
    token = __import__("secrets").token_urlsafe(32)
    r.setex(f"email:verify_token:{token}", 3600 * 24, user.email)
    email_code = f"{__import__('random').randint(100000, 999999)}"
    r.setex(f"email:otp:{user.email}", 600, email_code)
    
    try:
        send_email_verify.delay(user.email, token, email_code)
        increment_metrics(r, "metrics:otp:email_verify_send")
    except Exception as e:
        logger.exception("email_verify_send_failed email=%s", user.email)
    
    # Return verification flow response
    response = handle_verification_flow(user, db, attempted_login=False)
    
    duration = time.time() - start_time
    log_auth_operation("register", user_id=user.id, email=body.email, 
                      duration=duration, success=True)
    
    return response


@router.post("/request-email-verify")
def request_email_verify(body: EmailOTPRequest, r: Redis = Depends(get_redis), db: Session = Depends(get_db)) -> dict[str, Any]:
    """
    Request email verification for a user.
    
    Sends a verification email with both token and OTP options.
    If email is already verified, returns success without sending.
    """
    import time
    start_time = time.time()
    
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        log_auth_operation("request_email_verify", email=body.email, success=False, reason="user_not_found")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=USER_NOT_FOUND)
    
    # Check if email is already verified
    if user.email_verified:
        masked_email = mask_email(body.email)
        log_auth_operation("request_email_verify", user_id=user.id, email=body.email, 
                          success=True, reason="already_verified")
        return {
            "sent": False,
            "message": "Email is already verified",
            "email_masked": masked_email
        }
    
    # Check rate limiting
    rate_key = create_rate_limit_key("emailverify", body.email)
    is_allowed, count, remaining = check_rate_limit(
        r, rate_key, RateLimitConfig.EMAIL_VERIFY_WINDOW, 
        RateLimitConfig.EMAIL_VERIFY_MAX_ATTEMPTS, "email_verify"
    )
    
    if not is_allowed:
        increment_metrics(r, "metrics:auth:rate_limit_hits")
        ttl = r.ttl(rate_key) or 0
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS, 
            detail={"error": "rate_limited", "retry_in": max(0, int(ttl))}
        )
    
    # Generate verification tokens
    token = __import__("secrets").token_urlsafe(32)
    code = f"{__import__('random').randint(100000, 999999)}"
    
    # Store tokens in Redis
    r.setex(f"email:verify_token:{token}", 3600 * 24, body.email)
    r.setex(f"email:otp:{body.email}", 600, code)
    
    # Send verification email
    try:
        result = send_email_verify.delay(body.email, token, code)
        increment_metrics(r, "metrics:otp:email_verify_send")
        logger.info("otp.email_verify_send queued task_id=%s email=%s", 
                   getattr(result, "id", None), body.email)
    except Exception as e:
        logger.exception("otp.email_verify_send_failed email=%s", body.email)
    
    # Prepare response
    ttl = r.ttl(rate_key) or 0
    remaining = max(0, RateLimitConfig.EMAIL_VERIFY_MAX_ATTEMPTS - count)
    masked_email = mask_email(body.email)
    
    payload: dict[str, Any] = {
        "sent": True, 
        "cooldown_seconds": max(0, int(ttl)), 
        "remaining_requests": remaining, 
        "email_masked": masked_email
    }
    
    if settings.environment != "production":
        payload["debug_code"] = code
    
    duration = time.time() - start_time
    log_auth_operation("request_email_verify", user_id=user.id, email=body.email, 
                      duration=duration, success=True)
    
    return payload


@router.post("/verify-email")
def verify_email(body: dict[str, Any] = Body(...), r: Redis = Depends(get_redis), db: Session = Depends(get_db)) -> dict[str, Any]:
    """
    Verify email using token from verification email.
    
    Verifies the user's email address using the token sent in the verification email.
    Returns the next action in the verification flow.
    """
    import time
    start_time = time.time()
    
    token = body.get("token") if isinstance(body, dict) else None
    if not token:
        log_auth_operation("verify_email", success=False, reason="missing_token")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=MISSING_TOKEN)
    
    # Get email from token
    email_val = r.get(f"email:verify_token:{token}")
    if not email_val:
        log_auth_operation("verify_email", success=False, reason="invalid_token")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=TOKEN_INVALID)
    
    # Clean up token
    r.delete(f"email:verify_token:{token}")
    email = email_val.decode() if isinstance(email_val, (bytes, bytearray)) else str(email_val)
    
    # Find and verify user
    user = db.query(User).filter(User.email == email).first()
    if not user:
        log_auth_operation("verify_email", email=email, success=False, reason="user_not_found")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=USER_NOT_FOUND)
    
    # Mark email as verified if not already
    if not user.email_verified:
        user.email_verified = True
        db.add(user)
        db.commit()
        increment_metrics(r, "metrics:otp:email_verify_success")
    
    # Return verification flow response
    response = handle_verification_flow(user, db, attempted_login=False)
    
    duration = time.time() - start_time
    log_auth_operation("verify_email", user_id=user.id, email=email, 
                      duration=duration, success=True)
    
    return response


@router.post("/request-email-otp")
def request_email_otp(body: EmailOTPRequest, r: Redis = Depends(get_redis), db: Session = Depends(get_db)) -> dict[str, Any]:
    """
    Request email OTP for verification.
    
    Sends an OTP code to the user's email for verification.
    If email is already verified, returns next action without sending.
    """
    import time
    start_time = time.time()
    
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        log_auth_operation("request_email_otp", email=body.email, success=False, reason="user_not_found")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=USER_NOT_FOUND)
    
    # Check if email is already verified
    if user.email_verified:
        action = compute_next_action(user, attempted_login=False)
        masked_email = mask_email(body.email)
        log_auth_operation("request_email_otp", user_id=user.id, email=body.email, 
                          success=True, reason="already_verified")
        return {
            "sent": False,
            "message": "Email is already verified",
            "email_masked": masked_email,
            "action": action.value
        }
    
    # Check rate limiting
    rate_key = create_rate_limit_key("emailotp", body.email)
    is_allowed, count, remaining = check_rate_limit(
        r, rate_key, RateLimitConfig.OTP_WINDOW, 
        RateLimitConfig.OTP_MAX_ATTEMPTS, "email_otp"
    )
    
    if not is_allowed:
        increment_metrics(r, "metrics:auth:rate_limit_hits")
        ttl = r.ttl(rate_key) or 0
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS, 
            detail={"error": "rate_limited", "retry_in": max(0, int(ttl))}
        )
    
    # Generate and store OTP
    code = f"{__import__('random').randint(100000, 999999)}"
    key = f"email:otp:{body.email}"
    r.setex(key, 600, code)
    
    # Send OTP email
    try:
        send_email_otp.delay(body.email, code)
        increment_metrics(r, "metrics:otp:email_otp_send")
    except Exception as e:
        logger.exception("email_otp_send_failed email=%s", body.email)
    
    # Prepare response
    ttl = r.ttl(rate_key) or 0
    remaining = max(0, RateLimitConfig.OTP_MAX_ATTEMPTS - count)
    masked_email = mask_email(body.email)
    
    payload: dict[str, Any] = {
        "sent": True, 
        "cooldown_seconds": max(0, int(ttl)), 
        "remaining_requests": remaining, 
        "email_masked": masked_email
    }
    
    if settings.environment != "production":
        payload["debug_code"] = code
    
    duration = time.time() - start_time
    log_auth_operation("request_email_otp", user_id=user.id, email=body.email, 
                      duration=duration, success=True)
    
    return payload


@router.post("/verify-email-otp")
def verify_email_otp(body: EmailOTPVerifyRequest, r: Redis = Depends(get_redis), db: Session = Depends(get_db)) -> dict[str, Any]:
    """
    Verify email using OTP code.
    
    Verifies the user's email address using the OTP code sent to their email.
    If all verifications are complete, issues tokens for auto-login.
    """
    import time
    start_time = time.time()
    
    # Get and validate OTP
    key = f"email:otp:{body.email}"
    stored = r.get(key)
    if isinstance(stored, (bytes, bytearray)):
        try:
            stored = stored.decode()
        except Exception:
            stored = str(stored)
    
    if not stored or stored != body.code:
        increment_metrics(r, "metrics:otp:email_otp_invalid")
        log_auth_operation("verify_email_otp", email=body.email, success=False, reason="invalid_otp")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=INVALID_OTP)
    
    # Clean up OTP
    r.delete(key)
    
    # Find user
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        log_auth_operation("verify_email_otp", email=body.email, success=False, reason="user_not_found")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=USER_NOT_FOUND)
    
    # Mark email as verified if not already
    if not user.email_verified:
        user.email_verified = True
        db.add(user)
        db.commit()
        increment_metrics(r, "metrics:otp:email_verify_success")
    
    # Check if all verifications are complete for auto-login
    if user.email_verified and (not user.phone or user.phone_verified):
        # All verifications complete - issue tokens for auto-login
        response = create_token_response(user, db, response_format="session")
        duration = time.time() - start_time
        log_auth_operation("verify_email_otp", user_id=user.id, email=body.email, 
                          duration=duration, success=True, auto_login=True)
        return response
    
    # Return verification flow response
    response = handle_verification_flow(user, db, attempted_login=False)
    
    duration = time.time() - start_time
    log_auth_operation("verify_email_otp", user_id=user.id, email=body.email, 
                      duration=duration, success=True)
    
    return response


@router.post("/clear-rate-limits")
def clear_rate_limits(email: str, r: Redis = Depends(get_redis)) -> dict[str, Any]:
    """
    Clear rate limit keys for testing purposes.
    Only available in development environment.
    """
    if settings.environment not in {"development", "dev", "local"}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    
    rk = f"login:rate:{email}"
    deleted = r.delete(rk)
    
    logger.info("auth.rate_limits_cleared email=%s deleted=%s", email, deleted)
    
    return {
        "email": email,
        "deleted_keys": deleted,
        "message": "Rate limits cleared for testing"
    }


@router.post("/login")
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db), r: Redis = Depends(get_redis)) -> dict[str, Any]:
    """
    Optimized login endpoint with performance improvements:
    - Batched Redis operations using pipeline
    - Detailed performance logging
    - Improved error handling
    - Reduced bcrypt rounds for faster verification
    """
    import time
    start_time = time.time()
    
    # Batch Redis operations for better performance
    try:
        client_ip = request.client.host if request.client else "unknown"
        logger.info("auth.login_start email=%s ip=%s", body.email, client_ip)
        
        # Use Redis pipeline to batch operations
        pipe = r.pipeline()
        pipe.incr("metrics:auth:login_attempts")
        
        email_key = create_rate_limit_key("login", body.email)
        ip_key = create_rate_limit_key("login", client_ip, scope="ip")
        pipe.incr(email_key)
        pipe.incr(ip_key)
        
        # Execute batched operations
        redis_results = pipe.execute()
        login_attempts_count = redis_results[0]
        email_rate_count = redis_results[1]
        ip_rate_count = redis_results[2]
        
        # Set expiration only if this is the first attempt (count == 1)
        if email_rate_count == 1:
            r.expire(email_key, RateLimitConfig.LOGIN_WINDOW)
        if ip_rate_count == 1:
            r.expire(ip_key, RateLimitConfig.LOGIN_WINDOW)
        
        logger.debug("auth.redis_operations_completed email=%s attempts=%s rate_count=%s", 
                    body.email, login_attempts_count, email_rate_count)
        
        # Check rate limit - Allow up to 10 attempts per 15 minutes
        if email_rate_count > RateLimitConfig.LOGIN_MAX_ATTEMPTS or ip_rate_count > RateLimitConfig.LOGIN_MAX_ATTEMPTS_PER_IP:
            try:
                r.incr("metrics:auth:rate_limit_hits")
            except Exception as e:
                logger.warning("auth.rate_limit_metrics_failed error=%s", str(e))
            logger.warning(
                "auth.rate_limit_exceeded email=%s ip=%s email_count=%s ip_count=%s",
                body.email,
                client_ip,
                email_rate_count,
                ip_rate_count,
            )
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=RATE_LIMITED)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error("auth.redis_operations_failed email=%s error=%s", body.email, str(e))
        # Continue with login even if Redis fails
    
    # Database query with timing
    db_start = time.time()
    try:
        user = db.query(User).filter(User.email == body.email).first()
        db_duration = time.time() - db_start
        logger.debug("auth.db_query_completed email=%s duration=%.3fs", body.email, db_duration)
    except Exception as e:
        db_duration = time.time() - db_start
        logger.error("auth.db_query_failed email=%s duration=%.3fs error=%s", body.email, db_duration, str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=DATABASE_ERROR)
    
    # Password verification with timing
    if not user:
        logger.warning("auth.user_not_found email=%s", body.email)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=INVALID_CREDENTIALS)
    
    pwd_start = time.time()
    password_valid = verify_password(body.password, user.hashed_password)
    pwd_duration = time.time() - pwd_start
    logger.debug("auth.password_verification_completed email=%s duration=%.3fs", body.email, pwd_duration)
    
    if not password_valid:
        logger.warning("auth.invalid_password email=%s", body.email)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=INVALID_CREDENTIALS)
    
    # Compute next action
    action_start = time.time()
    action = compute_next_action(user, attempted_login=True)
    action_duration = time.time() - action_start
    logger.debug("auth.next_action_computed email=%s action=%s duration=%.3fs", 
                body.email, action.value, action_duration)
    
    if action == NextAction.issue_tokens:
        # Token generation with timing - using create_token_response as single source of truth
        token_start = time.time()
        response = create_token_response(user, db, response_format="session")
        token_duration = time.time() - token_start
        logger.debug("auth.tokens_generated email=%s duration=%.3fs", body.email, token_duration)
        
        # Success metrics
        try:
            r.incr("metrics:auth:login_success")
        except Exception as e:
            logger.warning("auth.success_metrics_failed error=%s", str(e))
        
        refresh_token_jti = "unknown"
        session_payload = response.get("session") if isinstance(response, dict) else None
        refresh_token = session_payload.get("refresh_token") if isinstance(session_payload, dict) else None
        if refresh_token:
            try:
                refresh_payload = decode_token(refresh_token)
                refresh_token_jti = str(refresh_payload.get("jti") or "unknown")
            except Exception:
                refresh_token_jti = "unknown"

        total_duration = time.time() - start_time
        logger.info("auth.login_success user_id=%s refresh_jti=%s total_duration=%.3fs db=%.3fs pwd=%.3fs tokens=%.3fs", 
                   user.id, refresh_token_jti, total_duration, db_duration, pwd_duration, token_duration)
        
        return response
    
    total_duration = time.time() - start_time
    logger.info("auth.login_action_required email=%s action=%s total_duration=%.3fs", 
               body.email, action.value, total_duration)
    
    return {
        "action": action.value,
        "email": user.email,
        "phone": user.phone,
    }


@router.post("/google")
def social_google(id_token: str, client_id: str | None = None, db: Session = Depends(get_db)) -> dict[str, Any]:
    if not settings.social_auth_enabled:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    aud = client_id or settings.google_client_id
    if not aud or not google_id_token or not google_requests:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=MISSING_CLIENT_ID)
    try:
        info = google_id_token.verify_oauth2_token(id_token, google_requests.Request(), aud)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=INVALID_ID_TOKEN)
    sub = str(info.get("sub"))
    email = str(info.get("email")) if info.get("email") else f"google:{sub}"
    user = db.query(User).filter((User.google_sub == sub) | (User.email == email)).first()
    if not user:
        user = User(email=email, hashed_password=hash_password("social"), google_sub=sub)
        db.add(user)
        db.commit()
    return create_token_response(user, db, response_format="session")


@router.post("/apple")
def social_apple(id_token: str, client_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    if not settings.social_auth_enabled:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    try:
        header = jwt.get_unverified_header(id_token)
        kid = header.get("kid")
        jwks = requests.get("https://appleid.apple.com/auth/keys", timeout=5).json()
        key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if not key:
            raise Exception("key not found")
        public_key = jwt.algorithms.RSAAlgorithm.from_jwk(key)
        payload = jwt.decode(id_token, public_key, algorithms=["RS256"], audience=client_id, issuer="https://appleid.apple.com")
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=INVALID_ID_TOKEN)
    sub = str(payload.get("sub"))
    email = str(payload.get("email")) if payload.get("email") else f"apple:{sub}"
    user = db.query(User).filter((User.apple_sub == sub) | (User.email == email)).first()
    if not user:
        user = User(email=email, hashed_password=hash_password("social"), apple_sub=sub)
        db.add(user)
        db.commit()
    return create_token_response(user, db, response_format="session")


@router.post("/refresh")
def refresh_token(body: dict[str, Any] = Body(...), db: Session = Depends(get_db)) -> dict[str, Any]:
    """
    Refresh access token using refresh token.
    
    This endpoint follows OAuth 2.0 refresh token flow:
    - Validates the refresh token
    - Generates a new access token
    - Rotates refresh token to prevent replay attacks
    - Returns new tokens without unnecessary database operations
    
    Security Note:
    - Refresh tokens are single-use and rotated on each refresh
    - Concurrent refresh attempts with the same token will fail for the second request
    - Frontend should implement deduplication to prevent concurrent refreshes
    
    Args:
        body: Request body containing refresh_token
        db: Database session
        
    Returns:
        dict: New access token and rotated refresh token
    """
    import time
    start_time = time.time()
    
    refresh_token = None
    if isinstance(body, dict):
        refresh_token = body.get("refresh_token")
    if not refresh_token:
        logger.warning("auth.refresh_missing_token")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=MISSING_REFRESH_TOKEN)
    
    try:
        payload = decode_token(refresh_token)
    except Exception as e:
        logger.warning("auth.refresh_decode_failed error=%s", str(e))
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=TOKEN_INVALID)
    
    if payload.get("type") != "refresh":
        logger.warning("auth.refresh_wrong_token_type")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=TOKEN_INVALID)
    
    jti = payload.get("jti")
    user_id = payload.get("sub")
    if not jti or not user_id:
        logger.warning("auth.refresh_missing_claims jti=%s user_id=%s", jti, user_id)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=TOKEN_INVALID)
    
    logger.info("auth.refresh_start user_id=%s jti=%s", user_id, jti)
    
    # Get refresh token from database
    rt = db.get(RefreshToken, str(jti))
    now = datetime.now(timezone.utc)
    exp = rt.expires_at if rt and rt.expires_at.tzinfo else (rt.expires_at.replace(tzinfo=timezone.utc) if rt else None)
    
    if not rt:
        logger.warning("auth.refresh_token_not_found user_id=%s jti=%s", user_id, jti)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=TOKEN_EXPIRED_OR_REVOKED)
    
    if rt.revoked:
        logger.warning("auth.refresh_token_already_revoked user_id=%s jti=%s", user_id, jti)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=TOKEN_EXPIRED_OR_REVOKED)
    
    if exp and exp <= now:
        logger.warning("auth.refresh_token_expired user_id=%s jti=%s exp=%s now=%s", 
                     user_id, jti, exp.isoformat() if exp else None, now.isoformat())
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=TOKEN_EXPIRED_OR_REVOKED)
    
    # Get user
    user = db.get(User, str(user_id))
    if not user:
        logger.warning("auth.refresh_user_not_found user_id=%s", user_id)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=USER_NOT_FOUND)
    
    # Rotate refresh token to prevent replay attacks
    # This is critical: once a refresh token is used, it's revoked and a new one is issued
    new_refresh_token, new_jti, new_refresh_exp = create_refresh_token(user.id)
    try:
        rt.revoked = True
        db.add(rt)
        db.add(RefreshToken(jti=new_jti, user_id=user.id, expires_at=new_refresh_exp, revoked=False))
        db.commit()
        logger.debug("auth.refresh_token_rotated user_id=%s old_jti=%s new_jti=%s", user.id, jti, new_jti)
    except Exception as exc:
        logger.exception("auth.refresh_rotation_failed user_id=%s jti=%s error=%s", user.id, jti, str(exc))
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=DATABASE_ERROR)

    # Generate new access token
    eff_perms = list(get_platform_permissions_for_roles([user.role]))
    claims = {"sub": user.id, "roles": [user.role], "permissions": eff_perms}
    access_token, access_exp = create_access_token(claims)
    
    # Calculate token expiry times
    access_expires_in = settings.access_token_expires_minutes * 60
    refresh_expires_in = max(int((new_refresh_exp - now).total_seconds()), 0)
    
    # Create user info
    user_info = {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "phone": user.phone,
        "avatar_key": user.avatar_key,
        "role": user.role,
        "roles": [user.role],
        "permissions": eff_perms,
        "email_verified": user.email_verified,
        "phone_verified": user.phone_verified,
        "preferred_currency": user.preferred_currency,
        "language": user.language,
        "notifications_enabled": user.notifications_enabled,
        "google_sub": user.google_sub,
        "apple_sub": user.apple_sub
    }
    
    duration = time.time() - start_time
    logger.info("auth.refresh_success user_id=%s old_jti=%s new_jti=%s duration=%.3fs", 
               user.id, jti, new_jti, duration)
    
    # Return response with rotated refresh token
    return {
        "action": "issue_tokens",
        "email": user.email,
        "phone": user.phone or "",
        "session": {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "expires_in": access_expires_in,
            "refresh_expires_in": refresh_expires_in,
            "user": user_info
        }
    }


@router.post("/revoke")
def revoke_token(refresh_token: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    payload = decode_token(refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=TOKEN_INVALID)
    jti = payload.get("jti")
    if not jti:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=TOKEN_INVALID)
    rt = db.get(RefreshToken, str(jti))
    if not rt:
        return {"revoked": True}
    rt.revoked = True
    db.add(rt)
    db.commit()
    return {"revoked": True}


@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordRequest, r: Redis = Depends(get_redis), db: Session = Depends(get_db)) -> dict[str, Any]:
    import secrets
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        return {"sent": True}
    rk = f"pwdreset:rate:{body.email}"
    try:
        cur = r.incr(rk)
        if cur == 1:
            r.expire(rk, 900)
        if cur and int(cur) > 5:
            return {"sent": True}
    except Exception:
        pass
    token = secrets.token_urlsafe(32)
    r.setex(f"pwdreset:token:{token}", 3600, body.email)
    try:
        result = send_password_reset.delay(body.email, token)
        logger.info("queued send_password_reset task_id=%s email=%s", getattr(result, "id", None), body.email)
    except Exception:
        logger.exception("failed to queue send_password_reset for %s", body.email)
    return {"sent": True}


@router.post("/validate-reset-token")
def validate_reset_token(body: dict[str, str], r: Redis = Depends(get_redis)) -> dict[str, Any]:
    """
    Validate a password reset token without consuming it.
    
    This endpoint checks if a reset token is valid and not expired
    without actually using the token, allowing for frontend validation.
    """
    token = body.get("token")
    if not token:
        return {"valid": False, "message": "Token is required"}
    
    # Check if token exists in Redis
    email_val = r.get(f"pwdreset:token:{token}")
    if not email_val:
        return {"valid": False, "message": "Invalid or expired token"}
    
    return {"valid": True, "message": "Token is valid"}


@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest, r: Redis = Depends(get_redis), db: Session = Depends(get_db)) -> dict[str, Any]:
    email_val = r.get(f"pwdreset:token:{body.token}")
    if not email_val:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=TOKEN_INVALID)
    r.delete(f"pwdreset:token:{body.token}")
    email = email_val.decode() if isinstance(email_val, (bytes, bytearray)) else str(email_val)
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=USER_NOT_FOUND)
    user.hashed_password = hash_password(body.new_password)
    db.add(user)
    db.commit()
    return {"reset": True}


@router.get("/permissions")
def get_permissions() -> dict[str, Any]:
    """
    Public endpoint to retrieve the permissions configuration.
    Returns the complete permissions manifest including platform permissions,
    group permissions, platform roles, and group roles.
    
    This endpoint is public and does not require authentication as it's needed
    for frontend build-time and runtime permission validation.
    """
    try:
        # Calculate path: backend/app/api/v1/endpoints/auth.py -> backend/app/auth/permissions.json
        # __file__ is backend/app/api/v1/endpoints/auth.py
        # We need to go up 4 levels: endpoints -> v1 -> api -> app, then into auth
        current_file = pathlib.Path(__file__)
        manifest_path = current_file.parent.parent.parent.parent / "auth" / "permissions.json"
        
        logger.info(f"[Auth] Loading permissions from: {manifest_path}")
        logger.info(f"[Auth] Current file: {current_file}, Resolved path: {manifest_path.absolute()}")
        
        if not manifest_path.exists():
            raise FileNotFoundError(f"Permissions file not found at: {manifest_path.absolute()}")
        
        with manifest_path.open("r", encoding="utf-8") as f:
            manifest = json.load(f)
        
        platform_perms_count = len(manifest.get("platform_permissions", []))
        group_perms_count = len(manifest.get("group_permissions", []))
        logger.info(
            f"[Auth] Successfully loaded permissions manifest: "
            f"{platform_perms_count} platform permissions, "
            f"{group_perms_count} group permissions"
        )
        return manifest
    except FileNotFoundError as e:
        logger.error(f"[Auth] Permissions file not found: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Permissions configuration not found: {str(e)}"
        )
    except json.JSONDecodeError as e:
        logger.error(f"[Auth] Failed to parse permissions.json: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Invalid permissions configuration format"
        )
    except Exception as e:
        logger.error(f"[Auth] Unexpected error loading permissions: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load permissions configuration"
        )
