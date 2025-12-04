from datetime import datetime, timedelta, timezone
import uuid
import jwt
from typing import Any
from ..core.config import settings


def create_access_token(claims: dict[str, Any]) -> str:
    to_encode = claims.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expires_minutes)
    to_encode.update({"exp": expire, "type": "access"})
    token = jwt.encode(to_encode, settings.secret_key, algorithm=settings.jwt_algorithm)
    return token, expire


def create_refresh_token(user_id: str, jti: str | None = None, minutes: int | None = None) -> tuple[str, str, datetime]:
    token_id = jti or str(uuid.uuid4())
    ttl = minutes if minutes is not None else settings.refresh_token_expires_minutes
    expire = datetime.now(timezone.utc) + timedelta(minutes=ttl)
    payload = {"sub": str(user_id), "jti": token_id, "exp": expire, "type": "refresh"}
    token = jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)
    return token, token_id, expire


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(
        token,
        settings.secret_key,
        algorithms=[settings.jwt_algorithm],
        options={"require": ["exp", "type", "sub"]},
    )

