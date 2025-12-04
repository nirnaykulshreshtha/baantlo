from __future__ import annotations
from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..base import Base, generate_id


class PlatformRole(str):
    PLATFORM_ADMIN = "PLATFORM_ADMIN"
    BASIC_USER = "BASIC_USER"


class User(Base):
    """User model representing platform users.
    
    This model stores user account information including authentication details,
    profile information, and platform-specific settings. All user IDs are UUIDs
    for better security and uniqueness.
    """
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_id)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String)
    role: Mapped[str] = mapped_column(String, default=PlatformRole.BASIC_USER)
    phone: Mapped[str | None] = mapped_column(String, unique=True, index=True, nullable=True)
    google_sub: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    apple_sub: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    display_name: Mapped[str | None] = mapped_column(String, nullable=True)
    avatar_key: Mapped[str | None] = mapped_column(String, nullable=True)
    preferred_currency: Mapped[str] = mapped_column(String, default="INR")
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    phone_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    language: Mapped[str] = mapped_column(String, default="en")
    notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    groups: Mapped[list["GroupMember"]] = relationship("GroupMember", back_populates="user", foreign_keys="GroupMember.user_id")

