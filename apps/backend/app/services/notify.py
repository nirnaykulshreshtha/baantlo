from __future__ import annotations
from sqlalchemy.orm import Session
from ..db.models import NotificationOutbox


def enqueue_notification(db: Session, user_id: str, type_: str, payload: dict) -> NotificationOutbox:
    rec = NotificationOutbox(user_id=user_id, type=type_, payload=payload, status="pending")
    db.add(rec)
    db.flush()
    return rec


