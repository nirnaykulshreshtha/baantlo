from pydantic import BaseModel, EmailStr, constr
from typing import List, Optional, Literal, Any
from decimal import Decimal
from datetime import datetime
from enum import Enum


class GroupType(str, Enum):
    """Group type enumeration"""
    TRIP = "trip"
    HOME = "home"
    COUPLE = "couple"
    PERSONAL = "personal"
    BUSINESS = "business"
    EVENT = "event"
    OTHER = "other"


class RegisterRequest(BaseModel):
    email: EmailStr
    password: constr(min_length=8)
    display_name: Optional[constr(min_length=1, max_length=64)] = None
    phone: Optional[constr(min_length=10, max_length=15)] = None
    preferred_currency: Optional[constr(min_length=3, max_length=3)] = None


class RegisterPhoneRequest(BaseModel):
    phone: constr(min_length=10, max_length=15)
    display_name: Optional[constr(min_length=1, max_length=64)] = None
    preferred_currency: Optional[constr(min_length=3, max_length=3)] = None
    password: Optional[constr(min_length=8)] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    refresh_token: str
    user: dict


class OTPRequest(BaseModel):
    phone: constr(min_length=10, max_length=15)


class OTPVerifyRequest(BaseModel):
    phone: constr(min_length=10, max_length=15)
    code: constr(min_length=4, max_length=6)


class EmailOTPRequest(BaseModel):
    email: EmailStr


class EmailOTPVerifyRequest(BaseModel):
    email: EmailStr
    code: constr(min_length=4, max_length=6)


class GroupCreateRequest(BaseModel):
    name: constr(min_length=1, max_length=80)
    base_currency: Optional[constr(min_length=3, max_length=3)] = None
    group_type: GroupType
    description: Optional[constr(max_length=500)] = None


class GroupUpdateRequest(BaseModel):
    name: Optional[constr(min_length=1, max_length=80)] = None
    base_currency: Optional[constr(min_length=3, max_length=3)] = None
    group_type: Optional[GroupType] = None
    description: Optional[constr(max_length=500)] = None
    invite_policy: Optional[constr(min_length=3, max_length=16)] = None
    avatar_key: Optional[constr(min_length=3, max_length=255)] = None


# Group type extra options (backend-driven UI extensions)
class GroupTypeExtraField(BaseModel):
    id: constr(min_length=1)
    label: constr(min_length=1)
    type: Literal["text", "number", "boolean", "select", "date", "date_range"]
    required: Optional[bool] = False
    description: Optional[str] = None
    # For select
    options: Optional[List[dict]] = None
    # Default value; may be str/number/bool/object
    default: Optional[Any] = None


class GroupTypeExtraOptionsResponse(BaseModel):
    fields: List[GroupTypeExtraField] = []


class GroupInviteRequest(BaseModel):
    via: Literal["email", "phone"]
    value: constr(min_length=3, max_length=200)
    client_request_id: constr(min_length=8)


class BulkInviteRecipient(BaseModel):
    via: Literal["email", "phone"]
    value: constr(min_length=3, max_length=200)


class GroupBulkInviteRequest(BaseModel):
    recipients: List[BulkInviteRecipient]
    client_request_id: constr(min_length=8)


class GroupBulkInviteItemResult(BaseModel):
    via: Literal["email", "phone"]
    value: constr(min_length=3, max_length=200)
    ok: bool
    invite_id: Optional[str] = None
    status: Optional[str] = None
    error: Optional[str] = None


class GroupBulkInviteResponse(BaseModel):
    results: List[GroupBulkInviteItemResult]


class GroupRoleChangeRequest(BaseModel):
    role: constr(min_length=5, max_length=6)


class FriendInviteRequest(BaseModel):
    via: Literal["email", "phone"]
    value: constr(min_length=3, max_length=200)
    client_request_id: constr(min_length=8)


class ProfileUpdateRequest(BaseModel):
    display_name: Optional[constr(min_length=1, max_length=64)] = None
    preferred_currency: Optional[constr(min_length=3, max_length=3)] = None
    language: Optional[constr(min_length=2, max_length=8)] = None
    notifications_enabled: Optional[bool] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: constr(min_length=8)
    new_password: constr(min_length=8)


class ChangePasswordRequest(BaseModel):
    current_password: constr(min_length=8)
    new_password: constr(min_length=8)


class TransferOwnershipRequest(BaseModel):
    new_owner_id: constr(min_length=1)


class LeaveGroupRequest(BaseModel):
    transfer_to: Optional[constr(min_length=1)] = None


# Expense Schemas
class ExpenseSplitRequest(BaseModel):
    user_id: str
    amount: Optional[Decimal] = None
    percentage: Optional[Decimal] = None


class ExpenseCreateRequest(BaseModel):
    group_id: str
    payer_id: str
    amount: Decimal
    currency: str = "INR"
    description: str
    expense_date: datetime
    splits: List[ExpenseSplitRequest]
    receipt_file: Optional[str] = None


class ExpenseUpdateRequest(BaseModel):
    description: Optional[str] = None
    expense_date: Optional[datetime] = None
    splits: Optional[List[ExpenseSplitRequest]] = None


class ExpenseResponse(BaseModel):
    id: str
    group_id: str
    payer_id: str
    payer_name: str
    amount: Decimal
    currency: str
    amount_inr: Decimal
    description: str
    expense_date: datetime
    receipt_key: Optional[str]
    created_by: str
    created_at: datetime
    splits: List[dict]


# Balance Schemas
class BalanceResponse(BaseModel):
    user_id: str
    user_name: str
    balance_inr: Decimal
    balance_currency: Decimal
    currency: str


class DebtSimplification(BaseModel):
    from_user_id: str
    from_user_name: str
    to_user_id: str
    to_user_name: str
    amount: Decimal
    currency: str


# Settlement Schemas
class SettlementCreateRequest(BaseModel):
    group_id: str
    from_user_id: str
    to_user_id: str
    amount: Decimal
    currency: str = "INR"
    method: Literal["cash", "upi", "bank_transfer"]
    notes: Optional[str] = None


class SettlementResponse(BaseModel):
    id: str
    group_id: str
    from_user_id: str
    from_user_name: str
    to_user_id: str
    to_user_name: str
    amount: Decimal
    amount_inr: Decimal
    currency: str
    method: str
    status: str
    notes: Optional[str]
    settled_at: Optional[datetime]
    created_by: str
    created_at: datetime
