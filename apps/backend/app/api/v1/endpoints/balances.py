from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ....db.deps import get_db
from ....db.models import Group, GroupMember, User
from ....auth.deps import get_current_user
from ....auth.rbac import has_permission
from ....services.balance import calculate_group_balances, simplify_debts, calculate_user_net_balance, get_group_expense_summary
from ..schemas import BalanceResponse, DebtSimplification
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


@router.get("/group/{group_id}")
def get_group_balances(
    group_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Get balances for all members in a group."""
    if not has_permission(current_user, "expense.read.group", group_id=group_id, db=db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=FORBIDDEN)
    
    # Validate group membership
    _validate_group_membership(group_id, current_user.id, db)
    
    # Calculate balances
    balances = calculate_group_balances(group_id, db)
    
    # Get simplified debts
    simplified_debts = simplify_debts(balances)
    
    # Get expense summary
    summary = get_group_expense_summary(group_id, db)
    
    return {
        "balances": [balance.dict() for balance in balances],
        "simplified_debts": [debt.dict() for debt in simplified_debts],
        "summary": summary
    }


@router.get("/user/{user_id}")
def get_user_balances(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Get user's net balance across all groups."""
    if not has_permission(current_user, "user.read.self") and current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=FORBIDDEN)
    
    # Calculate net balance with caching
    from ....core.redis import get_redis
    r = get_redis()
    net_balance = calculate_user_net_balance(user_id, db, r)
    
    # Get user info
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    user_name = user.display_name or user.email
    
    return {
        "user_id": user_id,
        "user_name": user_name,
        "net_balance_inr": net_balance,
        "currency": "INR"
    }


@router.get("/group/{group_id}/summary")
def get_group_summary(
    group_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Get expense summary for a group."""
    if not has_permission(current_user, "expense.read.group", group_id=group_id, db=db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=FORBIDDEN)
    
    # Validate group membership
    _validate_group_membership(group_id, current_user.id, db)
    
    # Get summary
    summary = get_group_expense_summary(group_id, db)
    
    return summary
