"""
Dashboard API endpoints for optimized data fetching.

This module provides optimized endpoints for dashboard data that minimize
the number of API calls and database queries required to load the dashboard.
"""

from __future__ import annotations
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from ....db.deps import get_db
from ....db.models import Group, GroupMember, User, Expense, Settlement, ExpenseSplit
from ....auth.deps import get_current_user
from ....auth.rbac import has_permission
from ....services.balance import calculate_user_net_balance, calculate_group_balances, simplify_debts
from ....core.redis import get_redis
import json
from ..errors import FORBIDDEN

router = APIRouter()


@router.get("/stats")
def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Get comprehensive dashboard statistics in a single optimized call.
    
    This endpoint combines data from multiple sources to minimize API calls
    and database queries for the frontend dashboard.
    """
    if not has_permission(current_user, "user.read.self"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=FORBIDDEN)
    
    user_id = current_user.id
    r = get_redis()
    cache_key = f"dash:user:{user_id}"

    # Try cached payload first
    try:
        raw = r.get(cache_key)
        if raw:
            data = json.loads(raw)
            return data
    except Exception:
        pass
    
    # Get all groups where user is an active member
    memberships = db.query(GroupMember).filter(
        GroupMember.user_id == user_id,
        GroupMember.status == "active"
    ).options(
        joinedload(GroupMember.group)
    ).all()
    
    group_ids = [membership.group_id for membership in memberships]
    total_groups = len(group_ids)
    
    # Calculate user's net balance (with caching)
    user_balance = calculate_user_net_balance(user_id, db, r)
    
    # Get comprehensive expense statistics across all groups
    expense_stats = db.query(
        func.count(Expense.id).label('total_expenses'),
        func.sum(Expense.amount_inr).label('total_amount'),
        func.avg(Expense.amount_inr).label('avg_amount'),
        func.count(Expense.id).filter(Expense.payer_id == user_id).label('expenses_paid_by_user'),
        func.sum(Expense.amount_inr).filter(Expense.payer_id == user_id).label('amount_paid_by_user')
    ).filter(
        Expense.group_id.in_(group_ids),
        Expense.deleted_at.is_(None)
    ).first()
    
    total_expenses = expense_stats.total_expenses or 0
    total_amount = expense_stats.total_amount or Decimal("0")
    avg_amount = expense_stats.avg_amount or Decimal("0")
    expenses_paid_by_user = expense_stats.expenses_paid_by_user or 0
    amount_paid_by_user = expense_stats.amount_paid_by_user or Decimal("0")
    
    # Get settlement statistics
    settlement_stats = db.query(
        func.count(Settlement.id).label('total_settlements'),
        func.count(Settlement.id).filter(Settlement.status == 'pending').label('pending_settlements')
    ).filter(Settlement.group_id.in_(group_ids)).first()
    
    total_settlements = settlement_stats.total_settlements or 0
    pending_settlements = settlement_stats.pending_settlements or 0
    
    # Build per-counterparty bilateral breakdown across groups using simplified debts
    breakdown_map: dict[str, dict] = {}
    for gid in group_ids:
        try:
            balances = calculate_group_balances(gid, db, r)
            debts = simplify_debts(balances)
        except Exception:
            debts = []

        for d in debts:
            if d.from_user_id == user_id:
                # You owe this counterparty
                entry = breakdown_map.get(d.to_user_id)
                if entry is None:
                    breakdown_map[d.to_user_id] = {
                        "user_id": d.to_user_id,
                        "user_name": d.to_user_name,
                        "amount_inr": -float(d.amount),  # negative => you owe
                        "currency": d.currency,
                        "groups_count": 1,
                    }
                else:
                    entry["amount_inr"] = float(entry["amount_inr"]) - float(d.amount)
                    entry["groups_count"] = int(entry.get("groups_count", 0)) + 1
            elif d.to_user_id == user_id:
                # Counterparty owes you
                entry = breakdown_map.get(d.from_user_id)
                if entry is None:
                    breakdown_map[d.from_user_id] = {
                        "user_id": d.from_user_id,
                        "user_name": d.from_user_name,
                        "amount_inr": float(d.amount),   # positive => they owe you
                        "currency": d.currency,
                        "groups_count": 1,
                    }
                else:
                    entry["amount_inr"] = float(entry["amount_inr"]) + float(d.amount)
                    entry["groups_count"] = int(entry.get("groups_count", 0)) + 1

    # Get recent expenses (last 15) with eager loading and group info
    recent_expenses = db.query(Expense).filter(
        Expense.group_id.in_(group_ids),
        Expense.deleted_at.is_(None)
    ).options(
        joinedload(Expense.payer),
        joinedload(Expense.group),
        joinedload(Expense.splits).joinedload(ExpenseSplit.user)
    ).order_by(Expense.created_at.desc()).limit(15).all()
    
    # Get recent settlements (last 15) with eager loading and group info
    recent_settlements = db.query(Settlement).filter(
        Settlement.group_id.in_(group_ids)
    ).options(
        joinedload(Settlement.from_user),
        joinedload(Settlement.to_user),
        joinedload(Settlement.group)
    ).order_by(Settlement.created_at.desc()).limit(15).all()
    
    # Format recent expenses with better context
    expense_activities = []
    for expense in recent_expenses:
        payer_name = expense.payer.display_name or expense.payer.email if expense.payer else "Unknown"
        group_name = expense.group.name if expense.group else "Unknown Group"
        
        # Check if current user was involved in this expense
        user_involved = any(split.user_id == user_id for split in expense.splits)
        payer_is_user = expense.payer_id == user_id if expense.payer_id else False
        
        if payer_is_user:
            description = f"You paid ₹{expense.amount_inr:.2f} for {expense.description} in {group_name}"
        elif user_involved:
            description = f"{payer_name} paid ₹{expense.amount_inr:.2f} for {expense.description} in {group_name}"
        else:
            description = f"{payer_name} added expense ₹{expense.amount_inr:.2f} in {group_name}"
            
        expense_activities.append({
            "id": expense.id,
            "type": "expense",
            "description": description,
            "amount": float(expense.amount_inr),
            "currency": "INR",
            "created_at": expense.created_at.isoformat(),
            "group_name": group_name,
            "group_id": expense.group_id,
            "user_involved": user_involved or payer_is_user
        })
    
    # Format recent settlements with better context
    settlement_activities = []
    for settlement in recent_settlements:
        from_name = settlement.from_user.display_name or settlement.from_user.email if settlement.from_user else "Unknown"
        to_name = settlement.to_user.display_name or settlement.to_user.email if settlement.to_user else "Unknown"
        group_name = settlement.group.name if settlement.group else "Unknown Group"
        
        # Check if current user was involved in this settlement
        user_is_from = settlement.from_user_id == user_id
        user_is_to = settlement.to_user_id == user_id
        
        if user_is_from and user_is_to:
            description = f"You settled ₹{settlement.amount_inr:.2f} with yourself in {group_name}"
        elif user_is_from:
            description = f"You paid ₹{settlement.amount_inr:.2f} to {to_name} in {group_name}"
        elif user_is_to:
            description = f"{from_name} paid you ₹{settlement.amount_inr:.2f} in {group_name}"
        else:
            description = f"{from_name} paid {to_name} ₹{settlement.amount_inr:.2f} in {group_name}"
            
        settlement_activities.append({
            "id": settlement.id,
            "type": "settlement",
            "description": description,
            "amount": float(settlement.amount_inr),
            "currency": "INR",
            "created_at": settlement.created_at.isoformat(),
            "group_name": group_name,
            "group_id": settlement.group_id,
            "user_involved": user_is_from or user_is_to
        })
    
    # Combine and sort recent activity, prioritizing user-involved activities
    recent_activity = expense_activities + settlement_activities
    recent_activity.sort(key=lambda x: (x['created_at'], x.get('user_involved', False)), reverse=True)
    recent_activity = recent_activity[:8]  # Top 8 most recent (increased from 5)
    
    # Get spending trend data (last 30 days)
    from datetime import datetime, timedelta
    thirty_days_ago = datetime.now() - timedelta(days=30)
    
    spending_trend = db.query(
        func.date(Expense.expense_date).label('date'),
        func.sum(Expense.amount_inr).label('total_amount'),
        func.sum(Expense.amount_inr).filter(Expense.payer_id == user_id).label('user_amount')
    ).filter(
        Expense.group_id.in_(group_ids),
        Expense.deleted_at.is_(None),
        Expense.expense_date >= thirty_days_ago
    ).group_by(
        func.date(Expense.expense_date)
    ).order_by(
        func.date(Expense.expense_date)
    ).all()
    
    # Format spending trend data
    spending_trend_data = []
    for trend in spending_trend:
        spending_trend_data.append({
            "date": trend.date.isoformat(),
            "total_amount": float(trend.total_amount or 0),
            "user_amount": float(trend.user_amount or 0)
        })
    
    # Get group-wise spending breakdown
    group_spending = db.query(
        Group.name.label('group_name'),
        Group.id.label('group_id'),
        func.sum(Expense.amount_inr).label('total_amount'),
        func.count(Expense.id).label('expense_count')
    ).join(
        Expense, Group.id == Expense.group_id
    ).filter(
        Expense.group_id.in_(group_ids),
        Expense.deleted_at.is_(None)
    ).group_by(
        Group.id, Group.name
    ).order_by(
        func.sum(Expense.amount_inr).desc()
    ).all()
    
    group_spending_data = []
    for group in group_spending:
        group_spending_data.append({
            "group_name": group.group_name,
            "group_id": group.group_id,
            "amount": float(group.total_amount or 0),
            "expense_count": group.expense_count or 0
        })
    
    # Get top expenses (last 30 days)
    top_expenses = db.query(Expense).filter(
        Expense.group_id.in_(group_ids),
        Expense.deleted_at.is_(None),
        Expense.expense_date >= thirty_days_ago
    ).options(
        joinedload(Expense.group),
        joinedload(Expense.payer)
    ).order_by(
        Expense.amount_inr.desc()
    ).limit(10).all()
    
    top_expenses_data = []
    for expense in top_expenses:
        payer_name = expense.payer.display_name or expense.payer.email if expense.payer else "Unknown"
        group_name = expense.group.name if expense.group else "Unknown Group"
        top_expenses_data.append({
            "id": expense.id,
            "description": expense.description,
            "amount": float(expense.amount_inr),
            "payer_name": payer_name,
            "group_name": group_name,
            "group_id": expense.group_id,
            "expense_date": expense.expense_date.isoformat(),
            "is_paid_by_user": expense.payer_id == user_id
        })
    
    # Get settlement statistics
    settlement_methods = db.query(
        Settlement.method,
        func.count(Settlement.id).label('count')
    ).filter(
        Settlement.group_id.in_(group_ids)
    ).group_by(
        Settlement.method
    ).all()
    
    payment_methods_data = []
    for method in settlement_methods:
        payment_methods_data.append({
            "method": method.method or "Unknown",
            "count": method.count or 0
        })
    
    # Calculate settlement completion rate
    total_settlements = total_settlements
    completed_settlements = total_settlements - pending_settlements
    completion_rate = (completed_settlements / total_settlements * 100) if total_settlements > 0 else 0
    
    # Get monthly comparison (current month vs previous month)
    from datetime import datetime
    now = datetime.now()
    current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    previous_month_start = (current_month_start - timedelta(days=1)).replace(day=1)
    
    current_month_spending = db.query(
        func.sum(Expense.amount_inr).label('amount')
    ).filter(
        Expense.group_id.in_(group_ids),
        Expense.deleted_at.is_(None),
        Expense.expense_date >= current_month_start
    ).scalar() or Decimal("0")
    
    previous_month_spending = db.query(
        func.sum(Expense.amount_inr).label('amount')
    ).filter(
        Expense.group_id.in_(group_ids),
        Expense.deleted_at.is_(None),
        Expense.expense_date >= previous_month_start,
        Expense.expense_date < current_month_start
    ).scalar() or Decimal("0")
    
    monthly_change = 0
    if previous_month_spending > 0:
        monthly_change = ((current_month_spending - previous_month_spending) / previous_month_spending) * 100
    
    # Generate action-focused data
    pending_actions = []
    
    # Add pending settlements as actions
    if pending_settlements > 0:
        pending_actions.append({
            "id": "pending-settlements",
            "type": "settlement",
            "title": f"{pending_settlements} Pending Settlements",
            "description": "Complete outstanding settlements",
            "urgency": "high",
            "action_text": "View All",
            "amount": float(user_balance) if user_balance else 0
        })
    
    # Add balance-related actions
    significant_balances = [v for v in breakdown_map.values() if abs(v["amount_inr"]) > 100]
    for balance in significant_balances[:5]:  # Limit to 5 most significant
        pending_actions.append({
            "id": f"balance-{balance['user_id']}",
            "type": "settlement",
            "title": f"{balance['user_name']} owes you ₹{abs(balance['amount_inr']):.0f}" if balance['amount_inr'] > 0 else f"You owe {balance['user_name']} ₹{abs(balance['amount_inr']):.0f}",
            "description": f"Settle up in {balance.get('groups_count', 1)} group(s)",
            "urgency": "high" if abs(balance['amount_inr']) > 1000 else "medium",
            "action_text": "Request Payment" if balance['amount_inr'] > 0 else "Pay Now",
            "amount": abs(balance['amount_inr']),
            "counterparty_name": balance['user_name']
        })
    
    # Generate groups overview data
    groups_overview = []
    for membership in memberships:
        group = membership.group
        # Get recent activity for this group
        recent_group_expense = db.query(Expense).filter(
            Expense.group_id == group.id,
            Expense.deleted_at.is_(None)
        ).order_by(Expense.created_at.desc()).first()
        
        # Count pending items
        pending_group_expenses = db.query(Expense).filter(
            Expense.group_id == group.id,
            Expense.deleted_at.is_(None),
            Expense.created_at >= datetime.now() - timedelta(days=7)
        ).count()
        
        pending_group_settlements = db.query(Settlement).filter(
            Settlement.group_id == group.id,
            Settlement.status == 'pending'
        ).count()
        
        groups_overview.append({
            "id": str(group.id),
            "name": group.name,
            "member_count": db.query(GroupMember).filter(
                GroupMember.group_id == group.id,
                GroupMember.status == "active"
            ).count(),
            "last_activity": recent_group_expense.created_at.isoformat() if recent_group_expense else None,
            "last_activity_type": "expense_added" if recent_group_expense else None,
            "pending_expenses": pending_group_expenses,
            "pending_settlements": pending_group_settlements,
            "is_settled": pending_group_settlements == 0
        })
    
    # Generate upcoming settlements
    upcoming_settlements = []
    for balance in significant_balances[:5]:
        due_date = datetime.now() + timedelta(days=len(upcoming_settlements) + 1)
        upcoming_settlements.append({
            "id": f"settlement-{balance['user_id']}",
            "description": f"Payment from {balance['user_name']}" if balance['amount_inr'] > 0 else f"Payment to {balance['user_name']}",
            "amount": abs(balance['amount_inr']),
            "due_date": due_date.isoformat(),
            "direction": "owes_you" if balance['amount_inr'] > 0 else "you_owe",
            "counterparty_name": balance['user_name'],
            "group_name": f"{balance.get('groups_count', 1)} group(s)"
        })
    
    response = {
        "total_groups": total_groups,
        "total_expenses": total_expenses,
        "total_settlements": total_settlements,
        "pending_settlements": pending_settlements,
        "user_balance": float(user_balance),
        "currency": "INR",
        "recent_activity": recent_activity,
        "total_amount": float(total_amount),
        "avg_amount": float(avg_amount),
        "expenses_paid_by_user": expenses_paid_by_user,
        "amount_paid_by_user": float(amount_paid_by_user),
        "balance_breakdown": sorted(
            [v for v in breakdown_map.values() if abs(v["amount_inr"]) > 0.005],
            key=lambda x: abs(x["amount_inr"]),
            reverse=True,
        ),
        # New analytics data
        "spending_trend": spending_trend_data,
        "group_spending": group_spending_data,
        "top_expenses": top_expenses_data,
        "settlement_stats": {
            "completed": completed_settlements,
            "pending": pending_settlements,
            "completion_rate": round(completion_rate, 1)
        },
        "payment_methods": payment_methods_data,
        "monthly_comparison": {
            "current_month": float(current_month_spending),
            "previous_month": float(previous_month_spending),
            "change_percent": round(monthly_change, 1)
        },
        # Action-focused data
        "pending_actions": pending_actions,
        "groups_overview": groups_overview,
        "upcoming_settlements": upcoming_settlements
    }

    # Cache the response for a short TTL (60s)
    try:
        r.setex(cache_key, 60, json.dumps(response))
    except Exception:
        pass

    return response


@router.get("/breakdown/{counterparty}")
def get_counterparty_breakdown(
    counterparty: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Return per-group simplified debts between the current user and a counterparty.

    Accepts either a user_id or an email as the `counterparty` path param.
    """
    if not has_permission(current_user, "user.read.self"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=FORBIDDEN)

    # Resolve counterparty_id
    counterparty_id: str | None = None
    if "@" in counterparty:
        cp = db.query(User).filter(User.email == counterparty.lower()).first()
        if cp:
            counterparty_id = cp.id
    else:
        counterparty_id = counterparty

    if not counterparty_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="counterparty not found")

    # Ensure both users share at least one active group
    user_id = current_user.id
    user_memberships = db.query(GroupMember).filter(GroupMember.user_id == user_id, GroupMember.status == "active").all()
    group_ids = [m.group_id for m in user_memberships]
    if not group_ids:
        return {"counterparty": {"user_id": counterparty_id}, "items": [], "totals": {"you_owe_count": 0, "owes_you_count": 0, "you_owe_total": 0.0, "owes_you_total": 0.0}}

    r = get_redis()
    items: list[dict] = []
    you_owe_count = owes_you_count = 0
    you_owe_total = owes_you_total = 0.0

    for gid in group_ids:
        try:
            balances = calculate_group_balances(gid, db, r)
            debts = simplify_debts(balances)
        except Exception:
            debts = []

        # Find debts involving the pair in this group
        for d in debts:
            if d.from_user_id == user_id and d.to_user_id == counterparty_id:
                # You owe
                g = db.get(Group, gid)
                amt = float(d.amount)
                you_owe_count += 1
                you_owe_total += amt
                items.append({
                    "group_id": gid,
                    "group_name": g.name if g else gid,
                    "amount_inr": amt,
                    "direction": "you_owe",
                    "currency": d.currency,
                })
            elif d.to_user_id == user_id and d.from_user_id == counterparty_id:
                # Owes you
                g = db.get(Group, gid)
                amt = float(d.amount)
                owes_you_count += 1
                owes_you_total += amt
                items.append({
                    "group_id": gid,
                    "group_name": g.name if g else gid,
                    "amount_inr": amt,
                    "direction": "owes_you",
                    "currency": d.currency,
                })

    cp_user = db.query(User).filter(User.id == counterparty_id).first()
    counterparty_obj = {"user_id": counterparty_id, "user_name": (cp_user.display_name or cp_user.email) if cp_user else counterparty_id}

    return {
        "counterparty": counterparty_obj,
        "items": items,
        "totals": {
            "you_owe_count": you_owe_count,
            "owes_you_count": owes_you_count,
            "you_owe_total": you_owe_total,
            "owes_you_total": owes_you_total,
        }
    }
