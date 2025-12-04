from __future__ import annotations
from sqlalchemy import String, Boolean, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from ..base import Base, generate_id


class IdentityClaim(Base):
    """IdentityClaim model representing user identity claims.
    
    This model stores user identity information like phone numbers and emails
    with verification status. All claim IDs are UUIDs for better security.
    """
    __tablename__ = "identity_claims"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_id)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True, nullable=False)
    claim_type: Mapped[str] = mapped_column(String, nullable=False)
    claim_value: Mapped[str] = mapped_column(String, nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    __table_args__ = (
        UniqueConstraint("claim_type", "claim_value", name="uq_claim_type_value"),
        CheckConstraint("claim_type in ('phone','email')", name="ck_claim_type"),
    )


