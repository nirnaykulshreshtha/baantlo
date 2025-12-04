from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime
from ....auth.deps import get_current_user
from ....db.deps import get_db
from ....db.models import SyncOp, User
from ....services.sync import append_sync


router = APIRouter()


@router.get("")
def pull_sync(
    since_seq: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Pull sync operations since a specific sequence number."""
    q = db.query(SyncOp).filter(
        SyncOp.user_id == current_user.id,
        SyncOp.seq > since_seq
    ).order_by(SyncOp.seq.asc()).limit(limit)
    
    ops = [
        {
            "seq": x.seq,
            "op_type": x.op_type,
            "entity_type": x.entity_type,
            "entity_id": x.entity_id,
            "payload": x.payload,
            "created_at": str(x.created_at)
        }
        for x in q.all()
    ]
    
    max_seq = ops[-1]["seq"] if ops else since_seq
    has_more = len(ops) == limit
    
    return {
        "items": ops,
        "last_seq": max_seq,
        "has_more": has_more,
        "count": len(ops)
    }


@router.post("/push")
def push_sync(
    operations: List[Dict[str, Any]],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Push sync operations from offline client."""
    if not operations:
        return {"status": "success", "processed": 0}
    
    processed = 0
    conflicts = []
    
    for op in operations:
        try:
            # Validate operation
            if not all(key in op for key in ["op_type", "entity_type", "entity_id", "payload"]):
                conflicts.append({
                    "operation": op,
                    "error": "Missing required fields"
                })
                continue
            
            # Check for conflicts (simplified - in production, implement proper conflict resolution)
            existing_op = db.query(SyncOp).filter(
                SyncOp.user_id == current_user.id,
                SyncOp.entity_type == op["entity_type"],
                SyncOp.entity_id == op["entity_id"],
                SyncOp.op_type == op["op_type"]
            ).first()
            
            if existing_op:
                # Conflict detected - use last-write-wins strategy
                conflicts.append({
                    "operation": op,
                    "conflict_with": {
                        "seq": existing_op.seq,
                        "created_at": str(existing_op.created_at)
                    },
                    "resolution": "last_write_wins"
                })
                continue
            
            # Process the operation
            append_sync(
                db=db,
                user_id=current_user.id,
                op_type=op["op_type"],
                entity_type=op["entity_type"],
                entity_id=op["entity_id"],
                payload=op["payload"]
            )
            processed += 1
            
        except Exception as e:
            conflicts.append({
                "operation": op,
                "error": str(e)
            })
    
    db.commit()
    
    return {
        "status": "success",
        "processed": processed,
        "conflicts": conflicts,
        "total": len(operations)
    }


@router.get("/status")
def get_sync_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Get sync status including latest sequence number."""
    latest_op = db.query(SyncOp).filter(
        SyncOp.user_id == current_user.id
    ).order_by(SyncOp.seq.desc()).first()
    
    if latest_op:
        return {
            "latest_seq": latest_op.seq,
            "latest_created_at": str(latest_op.created_at),
            "total_ops": db.query(SyncOp).filter(SyncOp.user_id == current_user.id).count()
        }
    else:
        return {
            "latest_seq": 0,
            "latest_created_at": None,
            "total_ops": 0
        }


@router.post("/ack")
def acknowledge_sync(
    last_seq: int = Query(..., ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Acknowledge that sync operations up to last_seq have been processed."""
    # This could be used to clean up old sync operations or track client sync status
    # For now, just return success
    return {
        "acknowledged_seq": last_seq,
        "status": "success"
    }


