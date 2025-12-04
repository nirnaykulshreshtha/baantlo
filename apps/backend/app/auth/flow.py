from enum import Enum
from typing import Optional
from pydantic import BaseModel


class NextAction(str, Enum):
    verify_phone = "verify_phone"
    verify_email = "verify_email"
    do_login = "do_login"
    issue_tokens = "issue_tokens"


class SessionPayload(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    user: dict


class NextActionResponse(BaseModel):
    action: NextAction
    email: Optional[str] = None
    phone: Optional[str] = None
    session: Optional[SessionPayload] = None


def compute_next_action(user, *, attempted_login: bool) -> NextAction:
    if getattr(user, "phone", None) and not getattr(user, "phone_verified", False):
        return NextAction.verify_phone
    if not getattr(user, "email_verified", False):
        return NextAction.verify_email
    if attempted_login:
        return NextAction.issue_tokens
    return NextAction.do_login


