from __future__ import annotations
from sqlalchemy import String, ForeignKey, Numeric, DateTime, CHAR, Index, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from decimal import Decimal
from datetime import datetime
from ..base import Base, generate_id


class Settlement(Base):
    """Settlement model representing debt settlements between users.
    
    This model stores settlement information including amounts, methods,
    and status. All settlement IDs are UUIDs for better security.
    """
    __tablename__ = "settlements"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_id)
    group_id: Mapped[str] = mapped_column(String, ForeignKey("groups.id"), nullable=False)
    from_user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    to_user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    amount_inr: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(CHAR(3), nullable=False)
    method: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    payment_id: Mapped[str | None] = mapped_column(String, nullable=True)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
    settled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_settlements_group_id", "group_id"),
        Index("idx_settlements_from_user_id", "from_user_id"),
        Index("idx_settlements_to_user_id", "to_user_id"),
        Index("idx_settlements_status", "status"),
        CheckConstraint("amount > 0", name="ck_settlement_amount_positive"),
        CheckConstraint("amount_inr > 0", name="ck_settlement_amount_inr_positive"),
        CheckConstraint("method IN ('cash', 'upi', 'bank_transfer')", name="ck_settlement_method"),
        CheckConstraint("status IN ('pending', 'completed', 'failed', 'cancelled')", name="ck_settlement_status"),
        CheckConstraint("from_user_id <> to_user_id", name="ck_settlement_different_users"),
    )

    group: Mapped["Group"] = relationship("Group")
    from_user: Mapped["User"] = relationship("User", foreign_keys=[from_user_id])
    to_user: Mapped["User"] = relationship("User", foreign_keys=[to_user_id])
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])
