from __future__ import annotations
from sqlalchemy import String, ForeignKey, UniqueConstraint, CheckConstraint, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from ..base import Base, generate_id


class GroupInvite(Base):
    """GroupInvite model representing group invitation requests.
    
    This model stores invitation information including invitee details,
    status, and tokens. All invite IDs are UUIDs for better security.
    """
    __tablename__ = "group_invites"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_id)
    group_id: Mapped[str] = mapped_column(String, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    inviter_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    invitee_user_id: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    invitee_claim_type: Mapped[str] = mapped_column(String, nullable=False)
    invitee_claim_value: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    token: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    ttl_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint("invitee_claim_type in ('phone','email')", name="ck_group_invite_claim_type"),
        CheckConstraint("status in ('pending','accepted','declined','expired','canceled')", name="ck_group_invite_status"),
    )


