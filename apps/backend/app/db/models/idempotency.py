from __future__ import annotations
from sqlalchemy import String, JSON, UniqueConstraint, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from ..base import Base, generate_id


class IdempotencyKey(Base):
    """IdempotencyKey model for preventing duplicate API requests.
    
    This model stores idempotency keys to ensure API requests are not
    processed multiple times. All keys use UUIDs for better security.
    """
    __tablename__ = "idempotency_keys"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_id)
    actor_user_id: Mapped[str] = mapped_column(String, index=True, nullable=False)
    client_request_id: Mapped[str] = mapped_column(String, nullable=False)
    response: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("actor_user_id", "client_request_id", name="uq_idem_actor_key"),
    )


