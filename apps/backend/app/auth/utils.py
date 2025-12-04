"""
Authentication Utilities

This module provides centralized utilities for common authentication operations
to ensure consistency and reduce code duplication across all auth endpoints.

Key Features:
- Centralized rate limiting logic with Redis pipeline optimization
- Standardized error handling and logging
- Common verification flow utilities
- Performance monitoring helpers
- Data masking utilities for privacy
- Consistent logging patterns across all auth operations
"""

from __future__ import annotations
import time
import logging
from typing import Any, Dict, Optional, Tuple
from fastapi import HTTPException, status
from redis import Redis
from sqlalchemy.orm import Session
from ..core.config import settings
from ..db.models import User
from .flow import NextAction, compute_next_action

logger = logging.getLogger(__name__)


class RateLimitConfig:
    """Configuration for rate limiting different operations"""
    
    # Login rate limiting
    LOGIN_WINDOW = 900  # 15 minutes
    LOGIN_MAX_ATTEMPTS = 10
    LOGIN_MAX_ATTEMPTS_PER_IP = 20
    
    # Registration rate limiting
    REGISTER_WINDOW = 900  # 15 minutes
    REGISTER_MAX_ATTEMPTS = 5
    REGISTER_MAX_ATTEMPTS_PER_IP = 10
    
    # OTP rate limiting
    OTP_WINDOW = settings.otp_rate_limit_window_seconds
    OTP_MAX_ATTEMPTS = settings.otp_max_requests_per_window
    
    # Email verification rate limiting
    EMAIL_VERIFY_WINDOW = settings.otp_rate_limit_window_seconds
    EMAIL_VERIFY_MAX_ATTEMPTS = settings.otp_max_requests_per_window


def check_rate_limit(
    r: Redis, 
    key: str, 
    window_seconds: int, 
    max_attempts: int,
    operation_name: str = "operation"
) -> Tuple[bool, int, int]:
    """
    Check if an operation is within rate limits.
    
    Args:
        r: Redis connection
        key: Rate limit key
        window_seconds: Time window in seconds
        max_attempts: Maximum attempts allowed in window
        operation_name: Name of operation for logging
        
    Returns:
        Tuple of (is_allowed, current_count, remaining_attempts)
    """
    try:
        # Use pipeline for atomic operations
        pipe = r.pipeline()
        pipe.incr(key)
        pipe.expire(key, window_seconds)
        results = pipe.execute()
        
        current_count = results[0]
        remaining = max(0, max_attempts - current_count)
        
        logger.debug("rate_limit_check operation=%s key=%s count=%s remaining=%s", 
                    operation_name, key, current_count, remaining)
        
        if current_count > max_attempts:
            logger.warning("rate_limit_exceeded operation=%s key=%s count=%s", 
                          operation_name, key, current_count)
            return False, current_count, remaining
            
        return True, current_count, remaining
        
    except Exception as e:
        logger.error("rate_limit_check_failed operation=%s key=%s error=%s", 
                    operation_name, key, str(e))
        # Allow operation to continue if Redis fails
        return True, 0, max_attempts


def increment_metrics(r: Redis, metric_name: str) -> None:
    """
    Safely increment a metric counter.
    
    Args:
        r: Redis connection
        metric_name: Name of the metric to increment
    """
    try:
        r.incr(metric_name)
    except Exception as e:
        logger.warning("metrics_increment_failed metric=%s error=%s", metric_name, str(e))


def log_auth_operation(
    operation: str,
    user_id: Optional[str] = None,
    email: Optional[str] = None,
    duration: Optional[float] = None,
    success: bool = True,
    **kwargs
) -> None:
    """
    Log authentication operations with consistent format.
    
    Args:
        operation: Name of the operation
        user_id: User ID if available
        email: User email if available
        duration: Operation duration in seconds
        success: Whether operation was successful
        **kwargs: Additional context to log
    """
    context = {
        "operation": operation,
        "success": success,
    }
    
    if user_id:
        context["user_id"] = user_id
    if email:
        context["email"] = email
    if duration is not None:
        context["duration"] = f"{duration:.3f}s"
    
    # Add any additional context
    context.update(kwargs)
    
    if success:
        logger.info("auth.operation_success %s", " ".join(f"{k}={v}" for k, v in context.items()))
    else:
        logger.warning("auth.operation_failed %s", " ".join(f"{k}={v}" for k, v in context.items()))




def handle_verification_flow(
    user: User, 
    db: Session, 
    attempted_login: bool = False
) -> Dict[str, Any]:
    """
    Handle the verification flow and return appropriate response.
    
    Args:
        user: User object
        db: Database session
        attempted_login: Whether this is from a login attempt
        
    Returns:
        Response dictionary with action and user info
    """
    action = compute_next_action(user, attempted_login=attempted_login)
    
    response = {
        "action": action.value,
        "email": user.email,
        "phone": user.phone or "",
    }
    
    # Add message for login attempts that require verification
    if attempted_login and action != NextAction.issue_tokens:
        response["message"] = f"Login requires additional action: {action.value}"
    
    return response


def create_rate_limit_key(operation: str, identifier: str, scope: str | None = None) -> str:
    """
    Create a standardized rate limit key.
    
    Args:
        operation: Operation type (login, register, otp, etc.)
        identifier: User identifier (email, phone, etc.)
        scope: Optional extra dimension (e.g., IP address)
        
    Returns:
        Rate limit key string
    """
    base = f"{operation}:rate:{identifier}"
    if scope:
        return f"{base}:{scope}"
    return base


def mask_email(email: str) -> str:
    """
    Mask email address for logging and responses.
    
    Args:
        email: Email address to mask
        
    Returns:
        Masked email address
    """
    if "@" not in email:
        return f"***{email[-4:]}"
    
    local, domain = email.split("@", 1)
    if len(local) <= 2:
        masked_local = "***"
    else:
        masked_local = f"***{local[-2:]}"
    
    return f"{masked_local}@{domain}"


def mask_phone(phone: str) -> str:
    """
    Mask phone number for logging and responses.
    
    Args:
        phone: Phone number to mask
        
    Returns:
        Masked phone number
    """
    if len(phone) <= 4:
        return f"***{phone[-2:]}"
    return f"***{phone[-4:]}"

