from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime
from decimal import Decimal

from ....db.deps import get_db
from ....db.models import Settlement, Group, GroupMember, User
from ....auth.deps import get_current_user
from ....auth.rbac import has_permission
from ....services.audit import write_audit
from ....services.sync import append_sync
from ....services.currency import convert_to_inr
from ....services.balance import invalidate_group_balance_cache
from ....services.cache_invalidation import invalidate_user_caches_for_group
from ....utils.ids import generate_token_128b
from ..schemas import SettlementCreateRequest, SettlementResponse
from ..errors import FORBIDDEN, USER_NOT_MEMBER

router = APIRouter()


def _validate_group_membership(group_id: str, user_id: str, db: Session) -> Group:
    """Validate that user is a member of the group."""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id,
        GroupMember.status == "active"
    ).first()
    
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=USER_NOT_MEMBER)
    
    return group


def _validate_settlement_users(group_id: str, from_user_id: str, to_user_id: str, db: Session) -> None:
    """Validate that both users are group members."""
    if from_user_id == to_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot settle with yourself"
        )
    
    memberships = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id.in_([from_user_id, to_user_id]),
        GroupMember.status == "active"
    ).all()
    
    member_user_ids = {m.user_id for m in memberships}
    if from_user_id not in member_user_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="From user is not a group member"
        )
    if to_user_id not in member_user_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="To user is not a group member"
        )


@router.post("", response_model=SettlementResponse)
def create_settlement(
    body: SettlementCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Create a new settlement."""
    if not has_permission(current_user, "settlement.create", group_id=body.group_id, db=db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=FORBIDDEN)
    
    # Validate group membership
    _validate_group_membership(body.group_id, current_user.id, db)
    
    # Validate settlement users
    _validate_settlement_users(body.group_id, body.from_user_id, body.to_user_id, db)
    
    # Create settlement
    amount_inr = convert_to_inr(body.amount, body.currency)
    
    settlement = Settlement(
        group_id=body.group_id,
        from_user_id=body.from_user_id,
        to_user_id=body.to_user_id,
        amount=body.amount,
        amount_inr=amount_inr,
        currency=body.currency,
        method=body.method,
        status="pending",
        notes=body.notes,
        created_by=current_user.id
    )
    
    db.add(settlement)
    
    # Get user names
    from_user = db.query(User).filter(User.id == body.from_user_id).first()
    to_user = db.query(User).filter(User.id == body.to_user_id).first()
    
    from_user_name = from_user.display_name or from_user.email if from_user else "Unknown"
    to_user_name = to_user.display_name or to_user.email if to_user else "Unknown"
    
    # Write audit log
    write_audit(
        db=db,
        actor_user_id=current_user.id,
        entity_type="settlement",
        entity_id=settlement.id,
        action="create",
        metadata={
            "group_id": body.group_id,
            "from_user_id": body.from_user_id,
            "to_user_id": body.to_user_id,
            "amount": str(body.amount),
            "currency": body.currency,
            "method": body.method
        }
    )
    
    # Append sync operation for all group members
    members = db.query(GroupMember).filter(GroupMember.group_id == body.group_id, GroupMember.status == "active").all()
    for member in members:
        append_sync(
            db=db,
            user_id=member.user_id,
            op_type="create",
            entity_type="settlement",
            entity_id=settlement.id,
            payload={
                "group_id": body.group_id,
                "from_user_name": from_user_name,
                "to_user_name": to_user_name,
                "from_user_id": body.from_user_id,
                "to_user_id": body.to_user_id,
                "amount": str(body.amount),
                "currency": body.currency,
                "method": body.method,
                "notes": body.notes
            }
        )
    
    db.commit()
    
    # Invalidate balance cache
    invalidate_group_balance_cache(body.group_id)
    invalidate_user_caches_for_group(db, body.group_id)
    
    return SettlementResponse(
        id=settlement.id,
        group_id=body.group_id,
        from_user_id=body.from_user_id,
        from_user_name=from_user_name,
        to_user_id=body.to_user_id,
        to_user_name=to_user_name,
        amount=body.amount,
        amount_inr=amount_inr,
        currency=body.currency,
        method=body.method,
        status="pending",
        notes=body.notes,
        settled_at=None,
        created_by=current_user.id,
        created_at=settlement.created_at
    )


@router.get("")
def list_settlements(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """List settlements for the current user across all groups."""
    # Get all groups where user is a member
    memberships = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id,
        GroupMember.status == "active"
    ).all()
    
    if not memberships:
        return {
            "items": [],
            "total": 0,
            "page": page,
            "page_size": page_size,
            "total_pages": 0
        }
    
    group_ids = [membership.group_id for membership in memberships]
    
    # Query settlements from all user's groups with eager loading to prevent N+1 queries
    from sqlalchemy.orm import joinedload
    
    query = db.query(Settlement).filter(Settlement.group_id.in_(group_ids)).options(
        joinedload(Settlement.from_user),
        joinedload(Settlement.to_user)
    )
    total = query.count()
    settlements = query.order_by(Settlement.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    # Format response (optimized - no additional queries needed due to eager loading)
    settlement_list = []
    for settlement in settlements:
        # User data is already loaded via joinedload
        from_user_name = settlement.from_user.display_name or settlement.from_user.email if settlement.from_user else "Unknown"
        to_user_name = settlement.to_user.display_name or settlement.to_user.email if settlement.to_user else "Unknown"
        
        settlement_list.append({
            "id": settlement.id,
            "group_id": settlement.group_id,
            "from_user_id": settlement.from_user_id,
            "from_user_name": from_user_name,
            "to_user_id": settlement.to_user_id,
            "to_user_name": to_user_name,
            "amount": settlement.amount,
            "amount_inr": settlement.amount_inr,
            "currency": settlement.currency,
            "method": settlement.method,
            "status": settlement.status,
            "notes": settlement.notes,
            "settled_at": settlement.settled_at,
            "created_by": settlement.created_by,
            "created_at": settlement.created_at
        })
    
    return {
        "items": settlement_list,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }


@router.get("/group/{group_id}")
def list_group_settlements(
    group_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """List settlements for a group."""
    if not has_permission(current_user, "settlement.read.group", group_id=group_id, db=db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=FORBIDDEN)
    
    # Validate group membership
    _validate_group_membership(group_id, current_user.id, db)
    
    # Query settlements
    query = db.query(Settlement).filter(Settlement.group_id == group_id)
    total = query.count()
    settlements = query.order_by(Settlement.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    # Format response
    settlement_list = []
    for settlement in settlements:
        from_user = db.query(User).filter(User.id == settlement.from_user_id).first()
        to_user = db.query(User).filter(User.id == settlement.to_user_id).first()
        
        from_user_name = from_user.display_name or from_user.email if from_user else "Unknown"
        to_user_name = to_user.display_name or to_user.email if to_user else "Unknown"
        
        settlement_list.append({
            "id": settlement.id,
            "group_id": settlement.group_id,
            "from_user_id": settlement.from_user_id,
            "from_user_name": from_user_name,
            "to_user_id": settlement.to_user_id,
            "to_user_name": to_user_name,
            "amount": settlement.amount,
            "amount_inr": settlement.amount_inr,
            "currency": settlement.currency,
            "method": settlement.method,
            "status": settlement.status,
            "notes": settlement.notes,
            "settled_at": settlement.settled_at,
            "created_by": settlement.created_by,
            "created_at": settlement.created_at
        })
    
    return {
        "items": settlement_list,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }


@router.post("/{settlement_id}/complete")
def complete_settlement(
    settlement_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Mark a settlement as completed."""
    settlement = db.query(Settlement).filter(Settlement.id == settlement_id).first()
    if not settlement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Settlement not found")
    
    # Validate group membership
    _validate_group_membership(settlement.group_id, current_user.id, db)
    
    # Check permissions
    can_approve = has_permission(current_user, "settlement.approve", group_id=settlement.group_id, db=db)
    if not can_approve:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=FORBIDDEN)
    
    if settlement.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Settlement is not pending"
        )
    
    # Update settlement
    settlement.status = "completed"
    settlement.settled_at = datetime.utcnow()
    db.commit()
    
    # Invalidate balance cache
    invalidate_group_balance_cache(settlement.group_id)
    invalidate_user_caches_for_group(db, settlement.group_id)
    
    # Write audit log
    write_audit(
        db=db,
        actor_user_id=current_user.id,
        entity_type="settlement",
        entity_id=settlement.id,
        action="complete",
        metadata={"group_id": settlement.group_id}
    )
    
    return {"status": "completed"}


@router.post("/{settlement_id}/cancel")
def cancel_settlement(
    settlement_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Cancel a settlement."""
    settlement = db.query(Settlement).filter(Settlement.id == settlement_id).first()
    if not settlement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Settlement not found")
    
    # Validate group membership
    _validate_group_membership(settlement.group_id, current_user.id, db)
    
    # Check permissions (creator or group owner)
    can_cancel = (
        settlement.created_by == current_user.id or
        has_permission(current_user, "settlement.approve", group_id=settlement.group_id, db=db)
    )
    if not can_cancel:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=FORBIDDEN)
    
    if settlement.status not in ["pending"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Settlement cannot be cancelled"
        )
    
    # Update settlement
    settlement.status = "cancelled"
    db.commit()
    
    # Write audit log
    write_audit(
        db=db,
        actor_user_id=current_user.id,
        entity_type="settlement",
        entity_id=settlement.id,
        action="cancel",
        metadata={"group_id": settlement.group_id}
    )
    
    return {"status": "cancelled"}


@router.get("/{settlement_id}")
def get_settlement(
    settlement_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Get settlement details."""
    settlement = db.query(Settlement).filter(Settlement.id == settlement_id).first()
    if not settlement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Settlement not found")
    
    # Validate group membership
    _validate_group_membership(settlement.group_id, current_user.id, db)
    
    # Get user names
    from_user = db.query(User).filter(User.id == settlement.from_user_id).first()
    to_user = db.query(User).filter(User.id == settlement.to_user_id).first()
    
    from_user_name = from_user.display_name or from_user.email if from_user else "Unknown"
    to_user_name = to_user.display_name or to_user.email if to_user else "Unknown"
    
    return {
        "id": settlement.id,
        "group_id": settlement.group_id,
        "from_user_id": settlement.from_user_id,
        "from_user_name": from_user_name,
        "to_user_id": settlement.to_user_id,
        "to_user_name": to_user_name,
        "amount": settlement.amount,
        "amount_inr": settlement.amount_inr,
        "currency": settlement.currency,
        "method": settlement.method,
        "status": settlement.status,
        "notes": settlement.notes,
        "settled_at": settlement.settled_at,
        "created_by": settlement.created_by,
        "created_at": settlement.created_at
    }


@router.put("/{settlement_id}")
def update_settlement(
    settlement_id: str,
    body: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Update a settlement (only notes and method for pending settlements)."""
    settlement = db.query(Settlement).filter(Settlement.id == settlement_id).first()
    if not settlement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Settlement not found")
    
    # Validate group membership
    _validate_group_membership(settlement.group_id, current_user.id, db)
    
    # Check permissions (creator only for pending settlements)
    can_update = (
        settlement.created_by == current_user.id and settlement.status == "pending"
    ) or has_permission(current_user, "settlement.update", group_id=settlement.group_id, db=db)
    
    if not can_update:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=FORBIDDEN)
    
    if settlement.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending settlements can be updated"
        )
    
    # Update allowed fields
    if "notes" in body:
        settlement.notes = body["notes"]
    if "method" in body and body["method"] in ["cash", "upi", "bank_transfer"]:
        settlement.method = body["method"]
    
    db.commit()
    
    # Write audit log
    write_audit(
        db=db,
        actor_user_id=current_user.id,
        entity_type="settlement",
        entity_id=settlement.id,
        action="update",
        metadata={"group_id": settlement.group_id}
    )
    
    return {"status": "updated"}
