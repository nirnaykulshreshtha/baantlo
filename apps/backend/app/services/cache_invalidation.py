"""
Cache invalidation helpers for user-facing cached aggregates.

This module centralizes invalidation of short-lived per-user caches used by
dashboard stats and groups overview responses. Call these functions after
expense/settlement mutations affecting a group.
"""

from __future__ import annotations
from typing import Iterable
from sqlalchemy.orm import Session

from ..core.redis import get_redis
from ..db.models import GroupMember


def _delete_keys(keys: Iterable[str]) -> None:
    r = get_redis()
    try:
        for k in keys:
            try:
                r.delete(k)
            except Exception:
                # Best-effort
                pass
    except Exception:
        pass


def invalidate_user_caches_for_group(db: Session, group_id: str) -> None:
    """Invalidate cached aggregates for all active members of a group.

    This clears keys:
    - dash:user:{id}
    - groups:overview:user:{id}
    """
    members = (
        db.query(GroupMember.user_id)
        .filter(GroupMember.group_id == group_id, GroupMember.status == "active")
        .all()
    )
    user_ids = [uid for (uid,) in members]
    if not user_ids:
        return

    keys = []
    for uid in user_ids:
        keys.append(f"dash:user:{uid}")
        keys.append(f"groups:overview:user:{uid}")
    _delete_keys(keys)


