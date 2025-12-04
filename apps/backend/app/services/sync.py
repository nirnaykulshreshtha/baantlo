from __future__ import annotations
from sqlalchemy.orm import Session
from sqlalchemy import func, select
from ..db.models import SyncOp


def append_sync(db: Session, user_id: str, op_type: str, entity_type: str, entity_id: str, payload: dict) -> SyncOp:
    next_seq = db.execute(
        select(func.coalesce(func.max(SyncOp.seq), 0) + 1).where(SyncOp.user_id == user_id)
    ).scalar_one()
    rec = SyncOp(user_id=user_id, seq=int(next_seq), op_type=op_type, entity_type=entity_type, entity_id=entity_id, payload=payload)
    db.add(rec)
    db.flush()
    return rec


