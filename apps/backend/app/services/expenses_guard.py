from __future__ import annotations
from sqlalchemy.orm import Session


def group_has_expenses(db: Session, group_id: str) -> bool:
    return False


