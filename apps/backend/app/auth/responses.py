"""
Authentication Response Utilities

This module provides the core response formatting function for authentication endpoints.
It standardizes the response format across different authentication flows to ensure
consistency and reduce code duplication.

Key Features:
- Optimized token response creation with single source of truth
- Consistent user information structure
- Centralized response creation logic
- Type hints for better IDE support
- Efficient database operations with error handling
"""

from __future__ import annotations
from typing import Any, Dict
from ..core.config import settings
from .tokens import create_access_token, create_refresh_token
from .rbac import get_platform_permissions_for_roles
from ..db.models import User, RefreshToken
from sqlalchemy.orm import Session


def create_token_response(
    user: User, 
    db: Session, 
    phone: str | None = None,
    response_format: str = "session"
) -> Dict[str, Any]:
    """
    Create a standardized token response for authenticated users.
    
    This function generates access and refresh tokens, stores the refresh token
    in the database, and returns a consistent response format used across
    all authentication endpoints.
    
    Args:
        user: The authenticated user object
        db: Database session for storing refresh token
        phone: Optional phone number to include in response (defaults to user.phone)
        response_format: Format type - "session" for session-based, "direct" for direct tokens
        
    Returns:
        dict: Standardized token response with session information
        
    Example:
        >>> response = create_token_response(user, db)
        >>> print(response["action"])  # "issue_tokens"
        >>> print(response["session"]["access_token"])  # JWT token
    """
    # Pre-calculate common values to avoid repeated calculations
    eff_perms = list(get_platform_permissions_for_roles([user.role]))
    access_expires_in = settings.access_token_expires_minutes * 60
    refresh_expires_in = settings.refresh_token_expires_minutes * 60
    
    # Create JWT claims
    claims = {"sub": user.id, "roles": [user.role], "permissions": eff_perms}
    
    # Generate tokens
    access, access_exp = create_access_token(claims)
    rtoken, jti, refresh_exp = create_refresh_token(user.id)
    
    # Store refresh token in database with error handling
    try:
        db.add(RefreshToken(jti=jti, user_id=user.id, expires_at=refresh_exp, revoked=False))
        db.commit()
    except Exception as e:
        db.rollback()
        raise Exception(f"Failed to store refresh token: {str(e)}")
    
    # Create user info object once to avoid duplication
    user_info = _create_user_info_dict(user, eff_perms)
    
    # Create common token data to avoid duplication
    token_data = {
        "access_token": access,
        "refresh_token": rtoken,
        "expires_in": access_expires_in,
        "refresh_expires_in": refresh_expires_in,
        "user": user_info
    }
    
    if response_format == "session":
        # Return session-based response (for OTP and email verification flows)
        return {
            "action": "issue_tokens",
            "email": user.email,
            "phone": phone or user.phone,
            "session": token_data
        }
    else:
        # Return direct token response (for login and OAuth flows)
        return {
            "token_type": "bearer",
            **token_data
        }


def _create_user_info_dict(user: User, eff_perms: list[str] | None = None) -> Dict[str, Any]:
    """
    Create a standardized user information dictionary.
    
    This is a private helper function to avoid code duplication
    between create_token_response and create_user_info_response.
    
    Args:
        user: The user object to format
        eff_perms: Optional permissions list (if None, will be calculated)
        
    Returns:
        dict: Standardized user information
    """
    if eff_perms is None:
        eff_perms = list(get_platform_permissions_for_roles([user.role]))
    
    return {
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


