from typing import Any
from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from .tokens import decode_token
from ..db.deps import get_db
from ..db.models import User
from ..api.v1.errors import TOKEN_INVALID as INVALID_TOKEN, USER_NOT_FOUND, MISSING_TOKEN


def get_current_user(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=MISSING_TOKEN)
    token = authorization.split(" ", 1)[1]
    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=INVALID_TOKEN)
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=INVALID_TOKEN)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=INVALID_TOKEN)
    user = db.get(User, str(user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=USER_NOT_FOUND)
    return user


def get_auth_context(user: User = Depends(get_current_user)) -> dict[str, Any]:
    return {
        "user_id": user.id,
        "roles": [user.role] if user.role else [],
        "permissions": [],
    }

