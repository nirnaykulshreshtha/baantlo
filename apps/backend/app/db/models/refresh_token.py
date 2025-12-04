from __future__ import annotations
from datetime import datetime
from sqlalchemy import String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from ..base import Base, generate_id


class RefreshToken(Base):
    """RefreshToken model representing JWT refresh tokens.
    
    This model stores refresh token information for JWT authentication.
    The JTI (JWT ID) is used as the primary key and should be a UUID.
    """
    __tablename__ = "refresh_tokens"

    jti: Mapped[str] = mapped_column(String, primary_key=True, default=generate_id)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)

