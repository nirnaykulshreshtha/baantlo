from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime
from ....db.deps import get_db
from ....db.models import Group, GroupInvite, FriendInvite, Friendship, GroupMember, User, Expense, Settlement
from ....auth.deps import get_current_user
from ....services.audit import write_audit
from ....auth.rbac import has_permission
from ....db.seed_admin import get_admin_user_info, verify_admin_user_exists
from ....services.analytics import get_comprehensive_analytics

router = APIRouter()


@router.get("/friend_invites")
def list_friend_invites(status: str | None = None, inviter_id: str | None = None, db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> dict:
    if not has_permission(current_user, "admin.full_access"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")

    q = db.query(FriendInvite)
    if status:
        q = q.filter(FriendInvite.status == status)
    if inviter_id:
        q = q.filter(FriendInvite.inviter_id == inviter_id)
    items = [
        {"id": x.id, "inviter_id": x.inviter_id, "invitee_user_id": x.invitee_user_id, "status": x.status, "created_at": str(x.created_at)}
        for x in q.all()
    ]
    write_audit(db, current_user.id, "admin", "friend_invites", "admin_read", {"filters": {"status": status, "inviter_id": inviter_id}})
    return {"items": items}


@router.get("/groups")

def admin_list_groups(owner_id: str | None = None, archived: bool | None = None, db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> dict:
    if not has_permission(current_user, "admin.full_access"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")

    q = db.query(Group)
    if owner_id is not None:
        q = q.filter(Group.owner_id == owner_id)
    if archived is not None:
        if archived:
            q = q.filter(Group.archived_at.isnot(None))
        else:
            q = q.filter(Group.archived_at.is_(None))
    items = [
        {"group_id": g.id, "owner_id": g.owner_id, "name": g.name, "currency": g.base_currency, "archived": bool(g.archived_at)}
        for g in q.all()
    ]
    write_audit(db, current_user.id, "admin", "groups", "admin_read", {"filters": {"owner_id": owner_id, "archived": archived}})
    return {"items": items}


@router.get("/friendships")
def admin_list_friendships(status: str | None = None, db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> dict:
    if not has_permission(current_user, "admin.full_access"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")

    q = db.query(Friendship)
    if status:
        q = q.filter(Friendship.status == status)
    items = [
        {"id": f.id, "user_a": f.user_a, "user_b": f.user_b, "status": f.status}
        for f in q.all()
    ]
    write_audit(db, current_user.id, "admin", "friendships", "admin_read", {"filters": {"status": status}})
    return {"items": items}


@router.get("/group_members")
def admin_list_group_members(group_id: str | None = None, user_id: str | None = None, status: str | None = None, role: str | None = None, db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> dict:
    if not has_permission(current_user, "admin.full_access"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")

    q = db.query(GroupMember)
    if group_id:
        q = q.filter(GroupMember.group_id == group_id)
    if user_id:
        q = q.filter(GroupMember.user_id == user_id)
    if status:
        q = q.filter(GroupMember.status == status)
    if role:
        q = q.filter(GroupMember.role == role)
    items = [
        {"id": gm.id, "group_id": gm.group_id, "user_id": gm.user_id, "status": gm.status, "role": gm.role}
        for gm in q.all()
    ]
    write_audit(db, current_user.id, "admin", "group_members", "admin_read", {"filters": {"group_id": group_id, "user_id": user_id, "status": status, "role": role}})
    return {"items": items}


@router.get("/analytics")
def get_admin_analytics(
    start_date: str | None = None, 
    end_date: str | None = None,
    db: Session = Depends(get_db), 
    current_user=Depends(get_current_user)
) -> dict:
    """Get comprehensive analytics data with optional date range filtering."""
    if not has_permission(current_user, "admin.full_access"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")
    
    try:
        # Parse date strings to datetime objects
        start_dt = None
        end_dt = None
        
        if start_date:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        if end_date:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        
        # Get comprehensive analytics
        analytics_data = get_comprehensive_analytics(db, start_dt, end_dt)
        
        write_audit(db, current_user.id, "admin", "analytics", "admin_read", {
            "start_date": start_date,
            "end_date": end_date
        })
        
        return analytics_data
        
    except ValueError as e:
        write_audit(db, current_user.id, "admin", "analytics", "admin_read_error", {"error": f"Invalid date format: {str(e)}"})
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date format")
    except Exception as e:
        write_audit(db, current_user.id, "admin", "analytics", "admin_read_error", {"error": str(e)})
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch analytics data")


@router.get("/dashboard")
def get_admin_dashboard_summary(
    start_date: str | None = None, 
    end_date: str | None = None,
    db: Session = Depends(get_db), 
    current_user=Depends(get_current_user)
) -> dict:
    """Get comprehensive admin dashboard summary with key metrics and recent activity."""
    if not has_permission(current_user, "admin.full_access"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")
    
    try:
        # Get basic counts
        total_users = db.query(User).count()
        total_groups = db.query(Group).count()
        active_groups = db.query(Group).filter(Group.archived_at.is_(None)).count()
        archived_groups = db.query(Group).filter(Group.archived_at.isnot(None)).count()
        
        # Get group member statistics
        total_group_members = db.query(GroupMember).count()
        active_group_members = db.query(GroupMember).filter(GroupMember.status == "active").count()
        
        # Get member role distribution
        member_role_counts = db.query(
            GroupMember.role, 
            func.count(GroupMember.id).label('count')
        ).group_by(GroupMember.role).all()
        member_role_counts_dict = {role or "unknown": count for role, count in member_role_counts}
        
        # Get member status distribution
        member_status_counts = db.query(
            GroupMember.status, 
            func.count(GroupMember.id).label('count')
        ).group_by(GroupMember.status).all()
        member_status_counts_dict = {status or "unknown": count for status, count in member_status_counts}
        
        # Get friend invite statistics
        total_friend_invites = db.query(FriendInvite).count()
        pending_friend_invites = db.query(FriendInvite).filter(FriendInvite.status == "pending").count()
        
        # Get friendship statistics
        total_friendships = db.query(Friendship).count()
        pending_friendships = db.query(Friendship).filter(Friendship.status == "pending").count()
        
        # Get recent groups (last 10)
        recent_groups = db.query(Group).order_by(desc(Group.created_at)).limit(10).all()
        groups_data = [
            {
                "group_id": g.id,
                "name": g.name,
                "owner_id": g.owner_id,
                "currency": g.base_currency,
                "archived": bool(g.archived_at),
                "created_at": g.created_at.isoformat() if g.created_at else None,
                "member_count": db.query(GroupMember).filter(GroupMember.group_id == g.id).count()
            }
            for g in recent_groups
        ]
        
        # Get recent friend invites (last 10)
        recent_friend_invites = db.query(FriendInvite).order_by(desc(FriendInvite.created_at)).limit(10).all()
        friend_invites_data = [
            {
                "id": invite.id,
                "inviter_id": invite.inviter_id,
                "invitee_user_id": invite.invitee_user_id,
                "status": invite.status,
                "created_at": invite.created_at.isoformat() if invite.created_at else None
            }
            for invite in recent_friend_invites
        ]
        
        # Get recent friendships (last 10)
        recent_friendships = db.query(Friendship).order_by(desc(Friendship.created_at)).limit(10).all()
        friendships_data = [
            {
                "id": f.id,
                "user_a": f.user_a,
                "user_b": f.user_b,
                "status": f.status,
                "created_at": f.created_at.isoformat() if f.created_at else None
            }
            for f in recent_friendships
        ]
        
        # Get expense statistics
        total_expenses = db.query(Expense).filter(Expense.deleted_at.is_(None)).count()
        total_expense_amount = db.query(func.sum(Expense.amount_inr)).filter(Expense.deleted_at.is_(None)).scalar() or 0
        
        # Get settlement statistics
        total_settlements = db.query(Settlement).count()
        completed_settlements = db.query(Settlement).filter(Settlement.status == "completed").count()
        pending_settlements = db.query(Settlement).filter(Settlement.status == "pending").count()
        
        # Get admin user info
        admin_info = get_admin_user_info()
        
        write_audit(db, current_user.id, "admin", "dashboard", "admin_read", {})
        
        return {
            "metrics": {
                "totalUsers": total_users,
                "totalGroups": total_groups,
                "activeGroups": active_groups,
                "archivedGroups": archived_groups,
                "totalGroupMembers": total_group_members,
                "activeGroupMembers": active_group_members,
                "totalFriendInvites": total_friend_invites,
                "pendingFriendInvites": pending_friend_invites,
                "totalFriendships": total_friendships,
                "pendingFriendships": pending_friendships,
                "totalExpenses": total_expenses,
                "totalExpenseAmount": float(total_expense_amount),
                "totalSettlements": total_settlements,
                "completedSettlements": completed_settlements,
                "pendingSettlements": pending_settlements,
                "memberRoleCounts": member_role_counts_dict,
                "memberStatusCounts": member_status_counts_dict
            },
            "groups": groups_data,
            "recentFriendInvites": friend_invites_data,
            "recentFriendships": friendships_data,
            "adminInfo": admin_info,
            "systemStatus": {
                "adminUserExists": verify_admin_user_exists(),
                "databaseConnected": True
            }
        }
        
    except Exception as e:
        write_audit(db, current_user.id, "admin", "dashboard", "admin_read_error", {"error": str(e)})
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch dashboard data")


@router.get("/admin-info")
def get_admin_info(current_user=Depends(get_current_user)) -> dict:
    """Get information about the admin user and system status."""
    if not has_permission(current_user, "admin.full_access"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")
    
    admin_info = get_admin_user_info()
    admin_exists = verify_admin_user_exists()
    
    return {
        "adminUser": admin_info,
        "adminExists": admin_exists,
        "currentAdmin": {
            "id": current_user.id,
            "email": current_user.email,
            "role": current_user.role
        }
    }
