from __future__ import annotations
from sqlalchemy import String, ForeignKey, Numeric, DateTime, Text, CHAR, Index, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from decimal import Decimal
from datetime import datetime
from ..base import Base, generate_id


class Expense(Base):
    """Expense model representing individual expenses within groups.
    
    This model stores expense information including amount, currency, description,
    and metadata. All expense IDs are UUIDs for better security and uniqueness.
    """
    __tablename__ = "expenses"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_id)
    group_id: Mapped[str] = mapped_column(String, ForeignKey("groups.id"), nullable=False)
    payer_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(CHAR(3), nullable=False)
    amount_inr: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False)
    expense_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    receipt_key: Mapped[str | None] = mapped_column(String, nullable=True)
    created_by: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("idx_expenses_group_id", "group_id"),
        Index("idx_expenses_payer_id", "payer_id"),
        Index("idx_expenses_created_by", "created_by"),
        Index("idx_expenses_expense_date", "expense_date"),
        CheckConstraint("amount > 0", name="ck_expense_amount_positive"),
        CheckConstraint("amount_inr > 0", name="ck_expense_amount_inr_positive"),
    )

    group: Mapped["Group"] = relationship("Group", back_populates="expenses")
    payer: Mapped["User"] = relationship("User", foreign_keys=[payer_id])
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])
    splits: Mapped[list["ExpenseSplit"]] = relationship("ExpenseSplit", back_populates="expense", cascade="all, delete-orphan")


class ExpenseSplit(Base):
    """ExpenseSplit model representing how expenses are split among users.
    
    This model stores the split information for each expense, including
    amounts and percentages. All split IDs are UUIDs for better security.
    """
    __tablename__ = "expense_splits"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_id)
    expense_id: Mapped[str] = mapped_column(String, ForeignKey("expenses.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    amount_inr: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    percentage: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_expense_splits_expense_id", "expense_id"),
        Index("idx_expense_splits_user_id", "user_id"),
        CheckConstraint("amount >= 0", name="ck_expense_split_amount_non_negative"),
        CheckConstraint("amount_inr >= 0", name="ck_expense_split_amount_inr_non_negative"),
        CheckConstraint("percentage IS NULL OR (percentage >= 0 AND percentage <= 100)", name="ck_expense_split_percentage_range"),
    )

    expense: Mapped["Expense"] = relationship("Expense", back_populates="splits")
    user: Mapped["User"] = relationship("User")
