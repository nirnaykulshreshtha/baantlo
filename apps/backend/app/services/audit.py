from __future__ import annotations
from sqlalchemy.orm import Session
from ..db.models import AuditLog


def write_audit(db: Session, actor_user_id: str | None, entity_type: str, entity_id: str, action: str, metadata: dict | None = None) -> None:
    record = AuditLog(
        actor_user_id=actor_user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        details=metadata or {},
    )
    db.add(record)
    db.flush()


