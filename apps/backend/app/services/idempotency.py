from __future__ import annotations
from typing import Callable
from sqlalchemy.orm import Session
from ..db.models import IdempotencyKey


def with_idempotency(db: Session, actor_user_id: str, client_request_id: str | None, handler: Callable[[], dict]) -> dict:
    if not client_request_id:
        return handler()
    existing = (
        db.query(IdempotencyKey)
        .filter(IdempotencyKey.actor_user_id == actor_user_id, IdempotencyKey.client_request_id == client_request_id)
        .first()
    )
    if existing:
        return existing.response
    response = handler()
    rec = IdempotencyKey(id=f"{actor_user_id}:{client_request_id}", actor_user_id=actor_user_id, client_request_id=client_request_id, response=response)
    db.add(rec)
    db.flush()
    return response


