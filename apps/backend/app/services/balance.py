from __future__ import annotations
from decimal import Decimal
from typing import Dict, List, DefaultDict
from collections import defaultdict
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
import json
import logging
from redis import Redis
from ..db.models import Expense, ExpenseSplit, GroupMember, User, Settlement
from ..api.v1.schemas import BalanceResponse, DebtSimplification
from ..core.redis import get_redis

# Configure logging for balance calculations
logger = logging.getLogger(__name__)


def calculate_group_balances(group_id: str, db: Session, r: Redis = None) -> List[BalanceResponse]:
    """
    Calculate net balances for each user in a group with caching.
    
    This function handles cases where expense splits may reference users who are no longer
    active group members, ensuring all users involved in expenses are included in balance calculations.
    """
    logger.info(f"Starting balance calculation for group_id: {group_id}")
    
    if r is None:
        r = get_redis()
    
    # Generate cache key based on group data hash
    cache_key = f"balance:group:{group_id}"
    
    # Try to get from cache first
    try:
        cached_data = r.get(cache_key)
        if cached_data:
            logger.info(f"Retrieved cached balance data for group_id: {group_id}")
            cached_balances = json.loads(cached_data)
            return [BalanceResponse(**balance) for balance in cached_balances]
    except Exception as e:
        logger.warning(f"Failed to retrieve cached balance data for group_id: {group_id}, error: {e}")
        pass  # Continue with database calculation if cache fails
    
    # Get all active group members with user data in one query
    members = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.status == "active"
    ).options(
        joinedload(GroupMember.user)
    ).all()
    
    logger.debug("Found %d active members in group_id=%s", len(members), group_id)
    
    if not members:
        logger.warning(f"No active members found for group_id: {group_id}")
        return []
    
    user_names: Dict[str, str] = {}
    for member in members:
        # Cache display names for active members
        name = member.user.display_name or member.user.email or member.user_id
        user_names[member.user_id] = name
    
    # Aggregate payer totals
    payer_totals = {
        row[0]: Decimal(row[1] or 0)
        for row in db.query(
            Expense.payer_id,
            func.coalesce(func.sum(Expense.amount_inr), 0)
        ).filter(
            Expense.group_id == group_id,
            Expense.deleted_at.is_(None)
        ).group_by(Expense.payer_id)
    }
    
    # Aggregate split totals
    split_totals = {
        row[0]: Decimal(row[1] or 0)
        for row in db.query(
            ExpenseSplit.user_id,
            func.coalesce(func.sum(ExpenseSplit.amount_inr), 0)
        ).join(
            Expense, Expense.id == ExpenseSplit.expense_id
        ).filter(
            Expense.group_id == group_id,
            Expense.deleted_at.is_(None)
        ).group_by(ExpenseSplit.user_id)
    }
    
    # Aggregate settlements (completed only)
    settlement_outgoing = {
        row[0]: Decimal(row[1] or 0)
        for row in db.query(
            Settlement.from_user_id,
            func.coalesce(func.sum(Settlement.amount_inr), 0)
        ).filter(
            Settlement.group_id == group_id,
            Settlement.status == "completed"
        ).group_by(Settlement.from_user_id)
    }
    
    settlement_incoming = {
        row[0]: Decimal(row[1] or 0)
        for row in db.query(
            Settlement.to_user_id,
            func.coalesce(func.sum(Settlement.amount_inr), 0)
        ).filter(
            Settlement.group_id == group_id,
            Settlement.status == "completed"
        ).group_by(Settlement.to_user_id)
    }
    
    # Collect every user id referenced in the aggregates
    all_user_ids = set(user_names.keys()) | set(payer_totals.keys()) | set(split_totals.keys()) | set(settlement_outgoing.keys()) | set(settlement_incoming.keys())
    
    # Backfill names for users not in the current active membership
    missing_user_ids = [uid for uid in all_user_ids if uid not in user_names]
    if missing_user_ids:
        for user in db.query(User.id, User.display_name, User.email).filter(User.id.in_(missing_user_ids)):
            user_names[user.id] = user.display_name or user.email or user.id
    
    # Ensure we have a fallback for any remaining ids
    for uid in all_user_ids:
        user_names.setdefault(uid, uid)
    
    balances: DefaultDict[str, Decimal] = defaultdict(lambda: Decimal("0"))
    for uid in all_user_ids:
        balances[uid]  # initialize zero entry so members with no activity appear
    
    for user_id, total in payer_totals.items():
        balances[user_id] += total
    
    for user_id, total in split_totals.items():
        balances[user_id] -= total
    
    for user_id, total in settlement_outgoing.items():
        balances[user_id] += total
    
    for user_id, total in settlement_incoming.items():
        balances[user_id] -= total
    
    result = [
        BalanceResponse(
            user_id=user_id,
            user_name=user_names[user_id],
            balance_inr=balance,
            balance_currency=balance,
            currency="INR",
        )
        for user_id, balance in balances.items()
    ]
    
    logger.debug(
        "Completed balance calculation for group_id=%s with %d participants",
        group_id,
        len(result),
    )
    
    # Cache the result for 5 minutes
    try:
        cache_data = [balance.dict() for balance in result]
        r.setex(cache_key, 300, json.dumps(cache_data, default=str))
        logger.debug("Cached balance data for group_id=%s", group_id)
    except Exception as e:
        logger.warning(f"Failed to cache balance data for group_id: {group_id}, error: {e}")
        pass  # Continue if caching fails
    
    return result


def simplify_debts(balances: List[BalanceResponse]) -> List[DebtSimplification]:
    """Simplify debts to minimize total transactions using a greedy algorithm."""
    # Separate creditors (positive balance) and debtors (negative balance)
    creditors = [(b.user_id, b.user_name, b.balance_inr) for b in balances if b.balance_inr > 0]
    debtors = [(b.user_id, b.user_name, -b.balance_inr) for b in balances if b.balance_inr < 0]
    
    # Sort by amount (largest first)
    creditors.sort(key=lambda x: x[2], reverse=True)
    debtors.sort(key=lambda x: x[2], reverse=True)
    
    simplified_debts = []
    i = j = 0
    
    while i < len(creditors) and j < len(debtors):
        creditor_id, creditor_name, creditor_amount = creditors[i]
        debtor_id, debtor_name, debtor_amount = debtors[j]
        
        # Calculate how much the debtor can pay to this creditor
        amount = min(creditor_amount, debtor_amount)
        
        if amount > Decimal("0.01"):  # Only include if amount is significant
            simplified_debts.append(DebtSimplification(
                from_user_id=debtor_id,
                from_user_name=debtor_name,
                to_user_id=creditor_id,
                to_user_name=creditor_name,
                amount=amount,
                currency="INR"
            ))
        
        # Update remaining amounts
        creditors[i] = (creditor_id, creditor_name, creditor_amount - amount)
        debtors[j] = (debtor_id, debtor_name, debtor_amount - amount)
        
        # Move to next creditor or debtor if current one is settled
        if creditors[i][2] <= Decimal("0.01"):
            i += 1
        if debtors[j][2] <= Decimal("0.01"):
            j += 1
    
    return simplified_debts


def calculate_user_net_balance(user_id: str, db: Session, r: Redis = None) -> Decimal:
    """
    Calculate user's net balance across all groups with caching.
    
    This function aggregates the user's balance across all groups where they are an active member.
    """
    logger.info(f"Starting user net balance calculation for user_id: {user_id}")
    
    if r is None:
        r = get_redis()
    
    # Generate cache key for user balance
    cache_key = f"balance:user:{user_id}"
    
    # Try to get from cache first
    try:
        cached_balance = r.get(cache_key)
        if cached_balance:
            logger.info(f"Retrieved cached user balance for user_id: {user_id}")
            return Decimal(cached_balance)
    except Exception as e:
        logger.warning(f"Failed to retrieve cached user balance for user_id: {user_id}, error: {e}")
        pass  # Continue with database calculation if cache fails
    
    # Get all groups where user is an active member
    memberships = db.query(GroupMember.group_id).filter(
        GroupMember.user_id == user_id,
        GroupMember.status == "active"
    ).all()
    
    group_ids = [membership.group_id for membership in memberships]
    
    logger.debug(
        "Found %d active group memberships for user_id=%s",
        len(group_ids),
        user_id,
    )
    
    if not group_ids:
        return Decimal("0")
    
    # Calculate aggregated totals directly from the database
    total_paid = db.query(
        func.coalesce(func.sum(Expense.amount_inr), 0)
    ).filter(
        Expense.payer_id == user_id,
        Expense.deleted_at.is_(None),
        Expense.group_id.in_(group_ids),
    ).scalar() or Decimal("0")
    
    total_owed = db.query(
        func.coalesce(func.sum(ExpenseSplit.amount_inr), 0)
    ).join(
        Expense, Expense.id == ExpenseSplit.expense_id
    ).filter(
        ExpenseSplit.user_id == user_id,
        Expense.deleted_at.is_(None),
        Expense.group_id.in_(group_ids),
    ).scalar() or Decimal("0")
    
    settlements_paid = db.query(
        func.coalesce(func.sum(Settlement.amount_inr), 0)
    ).filter(
        Settlement.from_user_id == user_id,
        Settlement.status == "completed",
        Settlement.group_id.in_(group_ids),
    ).scalar() or Decimal("0")
    
    settlements_received = db.query(
        func.coalesce(func.sum(Settlement.amount_inr), 0)
    ).filter(
        Settlement.to_user_id == user_id,
        Settlement.status == "completed",
        Settlement.group_id.in_(group_ids),
    ).scalar() or Decimal("0")
    
    total_balance = (
        Decimal(total_paid)
        - Decimal(total_owed)
        + Decimal(settlements_paid)
        - Decimal(settlements_received)
    )
    
    logger.debug(
        "Computed net balance for user_id=%s -> paid=%s owed=%s settled_out=%s settled_in=%s total=%s",
        user_id,
        total_paid,
        total_owed,
        settlements_paid,
        settlements_received,
        total_balance,
    )
    
    # Cache the result for 2 minutes (shorter than group balances since user balance changes more frequently)
    try:
        r.setex(cache_key, 120, str(total_balance))
        logger.debug("Cached user balance for user_id=%s", user_id)
    except Exception as e:
        logger.warning(f"Failed to cache user balance for user_id: {user_id}, error: {e}")
        pass  # Continue if caching fails
    
    return Decimal(total_balance)


def get_group_expense_summary(group_id: str, db: Session) -> Dict[str, any]:
    """Get summary statistics for a group's expenses."""
    expenses = db.query(Expense).filter(
        Expense.group_id == group_id,
        Expense.deleted_at.is_(None)
    ).all()
    
    total_amount = sum(expense.amount_inr for expense in expenses)
    expense_count = len(expenses)
    
    # Get unique payers
    payers = set(expense.payer_id for expense in expenses)
    
    return {
        "total_amount": total_amount,
        "expense_count": expense_count,
        "unique_payers": len(payers),
        "currency": "INR"
    }


def invalidate_group_balance_cache(group_id: str, r: Redis = None) -> None:
    """Invalidate cached balance data for a group."""
    if r is None:
        r = get_redis()
    
    try:
        cache_key = f"balance:group:{group_id}"
        r.delete(cache_key)
    except Exception:
        pass  # Continue if cache invalidation fails


def invalidate_user_balance_cache(user_id: str, r: Redis = None) -> None:
    """Invalidate cached balance data for a user across all groups."""
    if r is None:
        r = get_redis()
    
    try:
        # Invalidate user's own balance cache
        user_cache_key = f"balance:user:{user_id}"
        r.delete(user_cache_key)
        
        # Get all groups where user is a member and invalidate their caches
        from ..db.deps import get_db
        db = next(get_db())
        memberships = db.query(GroupMember).filter(
            GroupMember.user_id == user_id,
            GroupMember.status == "active"
        ).all()
        
        for membership in memberships:
            invalidate_group_balance_cache(membership.group_id, r)
    except Exception:
        pass  # Continue if cache invalidation fails
