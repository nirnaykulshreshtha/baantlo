"""
Groups Overview endpoint

Returns a consolidated, card-ready view of the current user's groups in a
single request. Results are cached briefly in Redis with a simple single-flight
lock to avoid stampedes under concurrent load.

Response shape (per group):
- id, name, member_count
- last_activity (ISO time) and last_activity_type
- pending_expenses (last 7 days), pending_settlements (status=pending)
- is_settled (no pending settlements)
"""

from __future__ import annotations
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
import json
import time

from ....db.deps import get_db
from ....db.models import Group, GroupMember, Expense, Settlement, User
from ....auth.deps import get_current_user
from ....auth.rbac import has_permission
from ....core.redis import get_redis
from ..errors import FORBIDDEN


router = APIRouter()


def _redis_get_json(key: str):
    r = get_redis()
    raw = r.get(key)
    if not raw:
        return None
    try:
        return json.loads(raw)
    except Exception:
        return None


def _redis_set_json(key: str, value, ttl_seconds: int) -> None:
    r = get_redis()
    try:
        r.setex(key, ttl_seconds, json.dumps(value))
    except Exception:
        # Best-effort cache
        pass


@router.get("/overview")
def get_groups_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50,
) -> dict:
    """Return consolidated group overview for the current user.

    Caches per-user results for a short TTL to dramatically reduce repeat load.
    """
    if not has_permission(current_user, "user.read.self"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=FORBIDDEN)

    user_id = current_user.id
    cache_key = f"groups:overview:user:{user_id}"
    lock_key = f"lock:{cache_key}"
    ttl_seconds = 45

    # Fast path from cache
    cached = _redis_get_json(cache_key)
    if cached is not None:
        return {"items": cached[: max(1, min(200, limit))]}

    r = get_redis()
    # Simple single-flight: try lock; if taken, wait briefly for cache
    got_lock = False
    try:
        got_lock = bool(r.set(lock_key, "1", nx=True, ex=3))
    except Exception:
        got_lock = False

    if not got_lock:
        # Wait up to ~1.5s for another worker to populate cache
        start = time.time()
        while time.time() - start < 1.5:
            time.sleep(0.05)
            cached = _redis_get_json(cache_key)
            if cached is not None:
                return {"items": cached[: max(1, min(200, limit))]}

    # Compute fresh
    memberships = (
        db.query(GroupMember)
        .filter(GroupMember.user_id == user_id, GroupMember.status == "active")
        .all()
    )
    if not memberships:
        if got_lock:
            try:
                r.delete(lock_key)
            except Exception:
                pass
        return {"items": []}

    group_ids = [m.group_id for m in memberships]

    # Member counts per group in a single query
    member_counts_rows = (
        db.query(GroupMember.group_id, func.count(GroupMember.id))
        .filter(GroupMember.group_id.in_(group_ids), GroupMember.status == "active")
        .group_by(GroupMember.group_id)
        .all()
    )
    member_counts = {gid: cnt for gid, cnt in member_counts_rows}

    # Last activity: latest expense or settlement per group
    latest_expense_rows = (
        db.query(Expense.group_id, func.max(Expense.created_at))
        .filter(Expense.group_id.in_(group_ids), Expense.deleted_at.is_(None))
        .group_by(Expense.group_id)
        .all()
    )
    latest_settlement_rows = (
        db.query(Settlement.group_id, func.max(Settlement.created_at))
        .filter(Settlement.group_id.in_(group_ids))
        .group_by(Settlement.group_id)
        .all()
    )
    latest_expense_map = {gid: ts for gid, ts in latest_expense_rows}
    latest_settlement_map = {gid: ts for gid, ts in latest_settlement_rows}

    # Pending counts
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    pending_expense_counts = (
        db.query(Expense.group_id, func.count(Expense.id))
        .filter(
            Expense.group_id.in_(group_ids),
            Expense.deleted_at.is_(None),
            Expense.created_at >= seven_days_ago,
        )
        .group_by(Expense.group_id)
        .all()
    )
    pending_expense_map = {gid: cnt for gid, cnt in pending_expense_counts}

    pending_settlement_counts = (
        db.query(Settlement.group_id, func.count(Settlement.id))
        .filter(Settlement.group_id.in_(group_ids), Settlement.status == "pending")
        .group_by(Settlement.group_id)
        .all()
    )
    pending_settlement_map = {gid: cnt for gid, cnt in pending_settlement_counts}

    # Base group info
    groups = db.query(Group).filter(Group.id.in_(group_ids)).all()
    groups_by_id = {g.id: g for g in groups}

    items: list[dict] = []
    for gid in group_ids:
        g = groups_by_id.get(gid)
        if not g:
            continue
        exp_ts = latest_expense_map.get(gid)
        set_ts = latest_settlement_map.get(gid)
        last_ts = None
        last_type = None
        if exp_ts and (not set_ts or exp_ts >= set_ts):
            last_ts = exp_ts
            last_type = "expense_added"
        elif set_ts:
            last_ts = set_ts
            last_type = "settlement_completed"  # or created

        pending_e = int(pending_expense_map.get(gid, 0) or 0)
        pending_s = int(pending_settlement_map.get(gid, 0) or 0)

        items.append(
            {
                "id": str(g.id),
                "name": g.name,
                "member_count": int(member_counts.get(gid, 0) or 0),
                "last_activity": last_ts.isoformat() if last_ts else None,
                "last_activity_type": last_type,
                "pending_expenses": pending_e,
                "pending_settlements": pending_s,
                "is_settled": pending_s == 0,
            }
        )

    # Sort by last activity desc for cache, slice by limit for response
    items.sort(key=lambda x: x["last_activity"] or "", reverse=True)

    # Store in cache
    _redis_set_json(cache_key, items, ttl_seconds)

    # Release lock
    if got_lock:
        try:
            r.delete(lock_key)
        except Exception:
            pass

    return {"items": items[: max(1, min(200, limit))]}


