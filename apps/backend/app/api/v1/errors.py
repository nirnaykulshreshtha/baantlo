"""
Error codes and their corresponding user-friendly messages.
This module provides centralized error handling for the API.
"""

# Error codes
INVALID_CREDENTIALS = "invalid_credentials"
EMAIL_NOT_VERIFIED = "email_not_verified"
PHONE_NOT_VERIFIED = "phone_not_verified"
RATE_LIMITED = "rate_limited"
USER_NOT_FOUND = "user_not_found"
INVALID_OTP = "invalid_otp"
CONSTRAINT_VIOLATION = "constraint_violation"
EMAIL_IN_USE = "email_in_use"
PHONE_IN_USE = "phone_in_use"
TOKEN_INVALID = "token_invalid"
TOKEN_EXPIRED_OR_REVOKED = "token_expired_or_revoked"
MISSING_REFRESH_TOKEN = "missing_refresh_token"
MISSING_TOKEN = "missing_token"
MISSING_CLIENT_ID = "missing_client_id"
INVALID_ID_TOKEN = "invalid_id_token"
DATABASE_ERROR = "database_error"
KEY_NOT_FOUND = "key_not_found"

ALREADY_FRIENDS = "already_friends"
INVITE_EXISTS = "invite_exists"
BLOCKED = "blocked"
ALREADY_MEMBER = "already_member"
INVITE_NOT_FOUND = "invite_not_found"
EXPIRED = "expired"
FORBIDDEN = "forbidden"
OWNER_MUST_TRANSFER = "owner_must_transfer_first"
GROUP_HAS_EXPENSES = "group_has_expenses"
GONE = "gone"
CURRENCY_LOCKED = "currency_locked"
CANNOT_REMOVE_OWNER = "cannot_remove_owner"
USER_NOT_MEMBER = "user_not_member"
INVALID_NEW_OWNER = "invalid_new_owner"
PENDING_DUES = "pending_dues"

# Error message mappings
ERROR_MESSAGES = {
    INVALID_CREDENTIALS: "Invalid email or password. Please check your credentials and try again.",
    EMAIL_NOT_VERIFIED: "Please verify your email address before logging in. Check your inbox for a verification link.",
    PHONE_NOT_VERIFIED: "Please verify your phone number before logging in. Check your messages for a verification code.",
    RATE_LIMITED: "Too many attempts. Please wait a few minutes before trying again.",
    USER_NOT_FOUND: "No account found with this email address. Please check your email or create a new account.",
    INVALID_OTP: "Invalid verification code. Please check the code and try again.",
    CONSTRAINT_VIOLATION: "The provided data violates our constraints. Please check your input and try again.",
    EMAIL_IN_USE: "An account with this email address already exists. Please use a different email or try logging in.",
    PHONE_IN_USE: "An account with this phone number already exists. Please use a different phone number or try logging in.",
    TOKEN_INVALID: "Invalid or expired token. Please log in again.",
    TOKEN_EXPIRED_OR_REVOKED: "Your session has expired. Please log in again.",
    MISSING_REFRESH_TOKEN: "Refresh token is required. Please log in again.",
    MISSING_TOKEN: "Authentication token is required. Please log in.",
    MISSING_CLIENT_ID: "Client ID is required for this operation.",
    INVALID_ID_TOKEN: "Invalid ID token. Please try again.",
    ALREADY_FRIENDS: "You are already friends with this user.",
    INVITE_EXISTS: "An invitation already exists for this user.",
    BLOCKED: "This action is not allowed. You have been blocked.",
    ALREADY_MEMBER: "User is already a member of this group.",
    INVITE_NOT_FOUND: "Invitation not found or has expired.",
    EXPIRED: "This invitation or link has expired. Please request a new one.",
    FORBIDDEN: "You don't have permission to perform this action.",
    OWNER_MUST_TRANSFER: "You must transfer ownership before leaving the group.",
    GROUP_HAS_EXPENSES: "Cannot perform this action because the group has existing expenses.",
    GONE: "The requested resource is no longer available.",
    CURRENCY_LOCKED: "Cannot change currency because the group has existing expenses.",
    CANNOT_REMOVE_OWNER: "Cannot remove the group owner. Transfer ownership first.",
    USER_NOT_MEMBER: "User is not a member of this group.",
    INVALID_NEW_OWNER: "Invalid new owner selected. Please choose a valid group member.",
    PENDING_DUES: "Cannot perform this action because there are pending dues in the group.",
}

def get_error_message(error_code: str) -> str:
    """
    Get user-friendly error message for an error code.
    
    Args:
        error_code: The error code to get message for
        
    Returns:
        User-friendly error message
    """
    return ERROR_MESSAGES.get(error_code, "An unexpected error occurred. Please try again.")

def create_error_response(error_code: str, status_code: int = 400) -> dict:
    """
    Create a standardized error response.
    
    Args:
        error_code: The error code
        status_code: HTTP status code
        
    Returns:
        Standardized error response dictionary
    """
    return {
        "error_code": error_code,
        "message": get_error_message(error_code),
        "detail": error_code
    }

