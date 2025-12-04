from __future__ import annotations
from sqlalchemy import String, ForeignKey, UniqueConstraint, CheckConstraint, Index, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from ..base import Base, generate_id


class Friendship(Base):
    """Friendship model representing user friendships.
    
    This model stores friendship relationships between users including
    status and metadata. All friendship IDs are UUIDs for better security.
    """
    __tablename__ = "friendships"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_id)
    user_a: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    user_b: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    initiator: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_a", "user_b", name="uq_friend_pair"),
        CheckConstraint("user_a <> user_b", name="ck_friend_not_self"),
        CheckConstraint("status in ('pending','accepted','declined','blocked')", name="ck_friend_status"),
        Index("idx_friendships_user_a", "user_a"),
        Index("idx_friendships_user_b", "user_b"),
    )


class FriendInvite(Base):
    """FriendInvite model representing friend invitation requests.
    
    This model stores friend invitation information including invitee details,
    status, and tokens. All invite IDs are UUIDs for better security.
    """
    __tablename__ = "friend_invites"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_id)
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
        CheckConstraint("invitee_claim_type in ('phone','email')", name="ck_friend_invite_claim_type"),
        CheckConstraint("status in ('pending','accepted','declined','expired','canceled')", name="ck_friend_invite_status"),
    )


