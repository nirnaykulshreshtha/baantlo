from __future__ import annotations
from sqlalchemy import String, ForeignKey, DateTime, CheckConstraint, UniqueConstraint, Index, CHAR, Text, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from ..base import Base, generate_id
import enum


class GroupRole(str):
    OWNER = "owner"
    MEMBER = "member"


class GroupType(str, enum.Enum):
    TRIP = "trip"
    HOME = "home"
    COUPLE = "couple"
    PERSONAL = "personal"
    BUSINESS = "business"
    EVENT = "event"
    OTHER = "other"


class Group(Base):
    """Group model representing expense groups.
    
    This model stores group information including name, currency, type, and settings.
    All group IDs are UUIDs for better security and uniqueness.
    """
    __tablename__ = "groups"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_id)
    name: Mapped[str] = mapped_column(String, index=True)
    base_currency: Mapped[str] = mapped_column(CHAR(3), default="INR")
    group_type: Mapped[str] = mapped_column(Enum(GroupType), default=GroupType.OTHER, nullable=False)
    invite_policy: Mapped[str] = mapped_column(String, default="members")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    owner_id: Mapped[str] = mapped_column(String, index=True)
    avatar_key: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    archived_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)

    members: Mapped[list["GroupMember"]] = relationship("GroupMember", back_populates="group", foreign_keys="GroupMember.group_id")
    expenses: Mapped[list["Expense"]] = relationship("Expense", back_populates="group")


class GroupMember(Base):
    """GroupMember model representing user membership in groups.
    
    This model stores the relationship between users and groups, including
    their role and status. All member IDs are UUIDs for better security.
    """
    __tablename__ = "group_members"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_id)
    group_id: Mapped[str] = mapped_column(String, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    role: Mapped[str] = mapped_column(String, default=GroupRole.MEMBER, nullable=False)
    status: Mapped[str] = mapped_column(String, default="active", nullable=False)
    invited_by: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("group_id", "user_id", name="uq_group_membership"),
        CheckConstraint("role in ('owner','member')", name="ck_group_role"),
        CheckConstraint("status in ('active','invited','left','removed')", name="ck_group_status"),
        Index("idx_group_members_group", "group_id"),
        Index("idx_group_members_user", "user_id"),
    )

    user: Mapped["User"] = relationship("User", back_populates="groups", foreign_keys=[user_id])
    group: Mapped[Group] = relationship("Group", back_populates="members", foreign_keys=[group_id])

