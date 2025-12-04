from __future__ import annotations
import datetime as dt
from fastapi import APIRouter, Depends, HTTPException, status
from redis import Redis
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from ....db.deps import get_db
from ....core.redis import get_redis
from ....db.models import Group, GroupMember, GroupRole, GroupInvite, User, SyncOp
from ....core.minio import get_minio
from ....core.config import settings
from ....auth.deps import get_current_user
from ....auth.rbac import has_permission
from ....services.audit import write_audit
from ....services.sync import append_sync
from ....services.notify import enqueue_notification
from ....services.idempotency import with_idempotency
from ....services.expenses_guard import group_has_expenses
from ....utils.identity import normalize_email, normalize_phone_e164
from ....utils.ids import generate_token_128b
from ....utils.ratelimit import sliding_window_allow
from ....tasks.notify import send_group_invite_email, send_group_invite_sms
from ..schemas import GroupCreateRequest, GroupUpdateRequest, GroupInviteRequest, GroupRoleChangeRequest, TransferOwnershipRequest, LeaveGroupRequest, GroupType, GroupTypeExtraOptionsResponse, GroupTypeExtraField, GroupBulkInviteRequest, GroupBulkInviteResponse, GroupBulkInviteItemResult
from ..errors import FORBIDDEN, ALREADY_MEMBER, INVITE_NOT_FOUND, GONE, OWNER_MUST_TRANSFER, GROUP_HAS_EXPENSES, RATE_LIMITED, CURRENCY_LOCKED, CANNOT_REMOVE_OWNER, USER_NOT_MEMBER, INVALID_NEW_OWNER, PENDING_DUES, EXPIRED
from ....services.balance import calculate_group_balances


router = APIRouter()
# Extra options for group types (backend-driven)
@router.get("/types/{group_type}/extra-options")
def get_group_type_extra_options(group_type: GroupType, current_user: User = Depends(get_current_user)) -> GroupTypeExtraOptionsResponse:
    # Basic permission: anyone who can create groups can view extra options
    if not has_permission(current_user, "group.create") and not has_permission(current_user, "admin.full_access"):
        raise HTTPException(status_code=403, detail={"error": FORBIDDEN})

    fields: list[GroupTypeExtraField] = []

    if group_type == GroupType.TRIP:
        fields.append(GroupTypeExtraField(
            id="trip_dates",
            label="Trip Dates",
            type="date_range",
            required=False,
            description="Select the trip start and end dates",
            default={"from": None, "to": None},
        ))

    # Other types can be extended here

    return GroupTypeExtraOptionsResponse(fields=fields)


@router.post("")
def create_group(body: GroupCreateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    if not has_permission(current_user, "group.create") and not has_permission(current_user, "admin.full_access"):
        raise HTTPException(status_code=403, detail={"error": FORBIDDEN})
    group = Group(
        name=body.name.strip(),
        base_currency=(body.base_currency or "INR").upper(),
        group_type=body.group_type.value,
        description=body.description,
        owner_id=current_user.id,
    )
    db.add(group)
    db.flush()
    db.add(GroupMember(user_id=current_user.id, group_id=group.id, role=GroupRole.OWNER, status="active"))
    write_audit(db, current_user.id, "group", group.id, "create", {})
    append_sync(db, current_user.id, "group_created", "group", group.id, {"name": group.name, "owner_id": current_user.id})
    db.commit()
    return {"group_id": group.id, "name": group.name, "base_currency": group.base_currency, "group_type": group.group_type, "owner_id": group.owner_id, "created_at": str(group.created_at)}


@router.get("")
def list_groups(current_user: User = Depends(get_current_user), db: Session = Depends(get_db), page: int = 1, page_size: int = 50, since_seq: int | None = None) -> dict:
    q = (
        db.query(GroupMember, Group)
        .join(Group, GroupMember.group_id == Group.id)
        .filter(GroupMember.user_id == current_user.id, GroupMember.status == "active")
    )
    rows = (
        q.order_by(GroupMember.created_at.desc())
        .offset(max(0, (page - 1) * page_size))
        .limit(min(200, page_size))
        .all()
    )

    group_ids = [group.id for _, group in rows]
    unread_counts: dict[str, int] = {}

    if since_seq is not None and group_ids:
        unread_rows = db.query(
            SyncOp.entity_id,
            func.count(SyncOp.id)
        ).filter(
            SyncOp.user_id == current_user.id,
            SyncOp.seq > since_seq,
            SyncOp.entity_type == "group",
            SyncOp.entity_id.in_(group_ids),
        ).group_by(SyncOp.entity_id).all()
        unread_counts = {entity_id: count for entity_id, count in unread_rows}

    items = []
    for gm, g in rows:
        avatar_url = None
        if getattr(g, "avatar_key", None):
            try:
                avatar_url = get_minio().get_presigned_url("GET", settings.minio_bucket, g.avatar_key)
            except Exception:
                avatar_url = None
        unread = unread_counts.get(g.id, 0)
        items.append({"group_id": g.id, "name": g.name, "base_currency": g.base_currency, "group_type": g.group_type, "role": gm.role, "unread_count": unread, "avatar_url": avatar_url})
    return {"items": items}


@router.get("/{group_id}")
def get_group(group_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db), page: int = 1, page_size: int = 50) -> dict:
    g = db.get(Group, group_id)
    if not g:
        raise HTTPException(status_code=404)
    mem = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == current_user.id).first()
    if not mem or mem.status not in {"active", "invited"}:
        raise HTTPException(status_code=403, detail={"error": FORBIDDEN})
    q = db.query(GroupMember).filter(GroupMember.group_id == group_id).options(joinedload(GroupMember.user))
    if mem.status == "invited":
        avatar_url = None
        if getattr(g, "avatar_key", None):
            try:
                avatar_url = get_minio().get_presigned_url("GET", settings.minio_bucket, g.avatar_key)
            except Exception:
                avatar_url = None
        return {"group_id": g.id, "name": g.name, "base_currency": g.base_currency, "group_type": g.group_type, "description": g.description, "owner_id": g.owner_id, "avatar_url": avatar_url, "members": []}
    members = q.order_by(GroupMember.created_at.asc()).offset(max(0, (page - 1) * page_size)).limit(min(200, page_size)).all()
    member_list = []
    for m in members:
        user = getattr(m, "user", None)
        user_name = None
        user_email = None
        if user:
            user_name = getattr(user, "display_name", None) or getattr(user, "email", None) or getattr(user, "phone", None) or user.id
            user_email = getattr(user, "email", None)
        member_list.append({
            "user_id": m.user_id,
            "role": m.role,
            "status": m.status,
            "user_name": user_name,
            "user_email": user_email,
        })
    avatar_url = None
    if getattr(g, "avatar_key", None):
        try:
            avatar_url = get_minio().get_presigned_url("GET", settings.minio_bucket, g.avatar_key)
        except Exception:
            avatar_url = None
    return {
        "group_id": g.id,
        "name": g.name,
        "base_currency": g.base_currency,
        "group_type": g.group_type,
        "description": g.description,
        "owner_id": g.owner_id,
        "avatar_url": avatar_url,
        "members": member_list,
    }


@router.post("/{group_id}/avatar/upload-url")
def get_group_avatar_upload_url(group_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    g = db.get(Group, group_id)
    if not g:
        raise HTTPException(status_code=404)
    if g.owner_id != current_user.id and not has_permission(current_user, "group.update.any") and not has_permission(current_user, "admin.full_access"):
        raise HTTPException(status_code=403, detail={"error": FORBIDDEN})
    client = get_minio()
    bucket = settings.minio_bucket
    object_name = f"group-avatars/{group_id}.png"
    try:
        url = client.get_presigned_url("PUT", bucket, object_name)
    except Exception:
        raise HTTPException(status_code=502, detail={"error": "storage_unavailable"})
    return {"upload_url": url, "key": object_name}


@router.post("/{group_id}/avatar/set")
def set_group_avatar(group_id: str, key: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    g = db.get(Group, group_id)
    if not g:
        raise HTTPException(status_code=404)
    if g.owner_id != current_user.id and not has_permission(current_user, "group.update.any") and not has_permission(current_user, "admin.full_access"):
        raise HTTPException(status_code=403, detail={"error": FORBIDDEN})
    g.avatar_key = key
    db.add(g)
    write_audit(db, current_user.id, "group", group_id, "avatar_set", {"key": key})
    db.commit()
    return {"status": "ok"}


@router.post("/{group_id}/avatar/clear")
def clear_group_avatar(group_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    g = db.get(Group, group_id)
    if not g:
        raise HTTPException(status_code=404)
    if g.owner_id != current_user.id and not has_permission(current_user, "group.update.any") and not has_permission(current_user, "admin.full_access"):
        raise HTTPException(status_code=403, detail={"error": FORBIDDEN})
    g.avatar_key = None
    db.add(g)
    write_audit(db, current_user.id, "group", group_id, "avatar_cleared", {})
    db.commit()
    return {"status": "ok"}


@router.patch("/{group_id}")
def update_group(group_id: str, body: GroupUpdateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    g = db.get(Group, group_id)
    if not g:
        raise HTTPException(status_code=404)
    if g.owner_id != current_user.id and not has_permission(current_user, "group.update.any") and not has_permission(current_user, "admin.full_access"):
        raise HTTPException(status_code=403, detail={"error": FORBIDDEN})
    if body.name is not None:
        g.name = body.name.strip()
    if body.base_currency is not None:
        if group_has_expenses(db, group_id):
            raise HTTPException(status_code=409, detail={"error": CURRENCY_LOCKED})
        g.base_currency = body.base_currency.upper()
    if body.description is not None:
        g.description = body.description
    if body.group_type is not None:
        g.group_type = body.group_type.value
    if body.invite_policy is not None:
        g.invite_policy = body.invite_policy
    if getattr(body, "avatar_key", None) is not None:
        g.avatar_key = body.avatar_key
    db.add(g)
    write_audit(db, current_user.id, "group", g.id, "update_settings", {})
    for m in db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.status == "active").all():
        append_sync(db, m.user_id, "group_updated", "group", g.id, {"name": g.name, "base_currency": g.base_currency})
    db.commit()
    return {"group_id": g.id, "name": g.name, "base_currency": g.base_currency, "group_type": g.group_type, "description": g.description, "owner_id": g.owner_id}


@router.post("/{group_id}/invites")
def create_group_invite(group_id: str, body: GroupInviteRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db), r: Redis = Depends(get_redis)) -> dict:
    g = db.get(Group, group_id)
    if not g:
        raise HTTPException(status_code=404)
    inviter_mem = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == current_user.id, GroupMember.status == "active").first()
    if not inviter_mem:
        raise HTTPException(status_code=403, detail={"error": FORBIDDEN})
    if g.invite_policy == "owner" and inviter_mem.role != GroupRole.OWNER:
        raise HTTPException(status_code=403, detail={"error": FORBIDDEN})
    via = body.via
    value = body.value
    rl_key = f"rl:group_invite:{current_user.id}"
    allowed, retry_in = sliding_window_allow(r, rl_key, 24 * 3600, 30)
    if not allowed:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail={"error": RATE_LIMITED, "retry_in": retry_in})
    def _handle() -> dict:
        if via == "email":
            claim_value = normalize_email(value)
        else:
            try:
                claim_value = normalize_phone_e164(value)
            except Exception:
                raise HTTPException(status_code=400, detail={"error": "invalid_phone"})
        existing_member = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.status == "active").join(User, GroupMember.user_id == User.id)
        if via == "email":
            existing_member = existing_member.filter(User.email == claim_value)
        else:
            existing_member = existing_member.filter(User.phone == claim_value)
        if existing_member.first():
            raise HTTPException(status_code=409, detail={"error": ALREADY_MEMBER})
        pending = db.query(GroupInvite).filter(
            GroupInvite.group_id == group_id,
            GroupInvite.invitee_claim_type == via,
            GroupInvite.invitee_claim_value == claim_value,
            GroupInvite.status == "pending",
        ).first()
        if pending:
            return {"invite_id": pending.id, "status": pending.status}
        token = generate_token_128b()
        inv = GroupInvite(
            id=generate_token_128b(),
            group_id=group_id,
            inviter_id=current_user.id,
            invitee_user_id=None,
            invitee_claim_type=via,
            invitee_claim_value=claim_value,
            status="pending",
            token=token,
            ttl_at=dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=7),
        )
        db.add(inv)
        db.flush()
        known_user = None
        if body.via == "email":
            known_user = db.query(User).filter(User.email == claim_value).first()
        else:
            known_user = db.query(User).filter(User.phone == claim_value).first()
        if known_user:
            gm = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == known_user.id).first()
            if not gm:
                gm = GroupMember(id=f"{group_id}:{known_user.id}", group_id=group_id, user_id=known_user.id, role=GroupRole.MEMBER, status="invited", invited_by=current_user.id)
                db.add(gm)
            inv.invitee_user_id = known_user.id
            db.add(inv)
            enqueue_notification(db, known_user.id, "group_invite", {"group_id": group_id, "invite_id": inv.id})
            append_sync(db, known_user.id, "group_invite_created", "group_invite", inv.id, {"invite_id": inv.id, "group_id": group_id, "group_name": g.name, "inviter_id": current_user.id, "inviter_name": (current_user.display_name or current_user.email)})
        if via == "email":
            send_group_invite_email.delay(claim_value, inv.token, g.name, inviter_label=current_user.id)
        else:
            send_group_invite_sms.delay(claim_value, inv.token, g.name, inviter_label=current_user.id)
        write_audit(db, current_user.id, "group_invite", inv.id, "invite", {})
        invitee_label = (known_user.display_name or known_user.email) if known_user else claim_value
        append_sync(db, current_user.id, "group_invite_created", "group_invite", inv.id, {"invite_id": inv.id, "group_id": group_id, "group_name": g.name, "inviter_id": current_user.id, "inviter_name": (current_user.display_name or current_user.email), "invitee": invitee_label, "invitee_user_id": (known_user.id if known_user else None)})
        db.commit()
        return {"invite_id": inv.id, "status": inv.status}
    return with_idempotency(db, current_user.id, body.client_request_id, _handle)


@router.post("/{group_id}/invites/bulk")
def create_group_invites_bulk(group_id: str, body: GroupBulkInviteRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db), r: Redis = Depends(get_redis)) -> GroupBulkInviteResponse:
    g = db.get(Group, group_id)
    if not g:
        raise HTTPException(status_code=404)
    inviter_mem = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == current_user.id, GroupMember.status == "active").first()
    if not inviter_mem:
        raise HTTPException(status_code=403, detail={"error": FORBIDDEN})
    if g.invite_policy == "owner" and inviter_mem.role != GroupRole.OWNER:
        raise HTTPException(status_code=403, detail={"error": FORBIDDEN})

    # Rate limit per bulk request (count toward the same daily bucket as singles)
    rl_key = f"rl:group_invite:{current_user.id}"
    allowed, retry_in = sliding_window_allow(r, rl_key, 24 * 3600, 30)
    if not allowed:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail={"error": RATE_LIMITED, "retry_in": retry_in})

    results: list[GroupBulkInviteItemResult] = []

    for rec in body.recipients:
        via = rec.via
        value = rec.value
        try:
            # Normalize
            if via == "email":
                claim_value = normalize_email(value)
            else:
                try:
                    claim_value = normalize_phone_e164(value)
                except Exception:
                    results.append(GroupBulkInviteItemResult(via=via, value=value, ok=False, error="invalid_phone"))
                    continue

            # Already a member?
            existing_member = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.status == "active").join(User, GroupMember.user_id == User.id)
            if via == "email":
                existing_member = existing_member.filter(User.email == claim_value)
            else:
                existing_member = existing_member.filter(User.phone == claim_value)
            if existing_member.first():
                results.append(GroupBulkInviteItemResult(via=via, value=value, ok=False, error=ALREADY_MEMBER))
                continue

            # Pending invite exists?
            pending = db.query(GroupInvite).filter(
                GroupInvite.group_id == group_id,
                GroupInvite.invitee_claim_type == via,
                GroupInvite.invitee_claim_value == claim_value,
                GroupInvite.status == "pending",
            ).first()
            if pending:
                results.append(GroupBulkInviteItemResult(via=via, value=value, ok=True, invite_id=pending.id, status=pending.status))
                continue

            token = generate_token_128b()
            inv = GroupInvite(
                id=generate_token_128b(),
                group_id=group_id,
                inviter_id=current_user.id,
                invitee_user_id=None,
                invitee_claim_type=via,
                invitee_claim_value=claim_value,
                status="pending",
                token=token,
                ttl_at=dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=7),
            )
            db.add(inv)
            db.flush()

            known_user = None
            if via == "email":
                known_user = db.query(User).filter(User.email == claim_value).first()
            else:
                known_user = db.query(User).filter(User.phone == claim_value).first()
            if known_user:
                gm = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == known_user.id).first()
                if not gm:
                    gm = GroupMember(id=f"{group_id}:{known_user.id}", group_id=group_id, user_id=known_user.id, role=GroupRole.MEMBER, status="invited", invited_by=current_user.id)
                    db.add(gm)
                inv.invitee_user_id = known_user.id
                db.add(inv)
                enqueue_notification(db, known_user.id, "group_invite", {"group_id": group_id, "invite_id": inv.id})
                append_sync(db, known_user.id, "group_invite_created", "group_invite", inv.id, {"invite_id": inv.id, "group_id": group_id, "group_name": g.name, "inviter_id": current_user.id, "inviter_name": (current_user.display_name or current_user.email)})

            if via == "email":
                send_group_invite_email.delay(claim_value, inv.token, g.name, inviter_label=current_user.id)
            else:
                send_group_invite_sms.delay(claim_value, inv.token, g.name, inviter_label=current_user.id)

            write_audit(db, current_user.id, "group_invite", inv.id, "invite", {})
            invitee_label = (known_user.display_name or known_user.email) if known_user else claim_value
            append_sync(db, current_user.id, "group_invite_created", "group_invite", inv.id, {"invite_id": inv.id, "group_id": group_id, "group_name": g.name, "inviter_id": current_user.id, "inviter_name": (current_user.display_name or current_user.email), "invitee": invitee_label, "invitee_user_id": (known_user.id if known_user else None)})

            results.append(GroupBulkInviteItemResult(via=via, value=value, ok=True, invite_id=inv.id, status=inv.status))
        except HTTPException as he:  # reuse same error codes
            detail = getattr(he, "detail", {}) or {}
            results.append(GroupBulkInviteItemResult(via=via, value=value, ok=False, error=(detail.get("error") if isinstance(detail, dict) else str(detail))))
        except Exception:
            results.append(GroupBulkInviteItemResult(via=via, value=value, ok=False, error="invite_failed"))

    db.commit()
    return GroupBulkInviteResponse(results=results)


def _get_group_invite_or_410(db: Session, invite_id: str) -> GroupInvite:
    inv = db.get(GroupInvite, invite_id)
    if not inv:
        raise HTTPException(status_code=404, detail={"error": INVITE_NOT_FOUND})
    if inv.status == "pending" and inv.ttl_at and inv.ttl_at < dt.datetime.now(dt.timezone.utc):
        inv.status = "expired"
        db.add(inv)
        db.flush()
        raise HTTPException(status_code=410, detail={"error": GONE})
    return inv


@router.get("/{group_id}/invites")
def list_group_invites(group_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db), status_filter: str | None = None, page: int = 1, page_size: int = 50) -> dict:
    g = db.get(Group, group_id)
    if not g:
        raise HTTPException(status_code=404)
    inviter_mem = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == current_user.id).first()
    if not inviter_mem or inviter_mem.status != "active":
        raise HTTPException(status_code=403, detail={"error": FORBIDDEN})
    q = db.query(GroupInvite).filter(GroupInvite.group_id == group_id)
    q = q.filter(GroupInvite.status == (status_filter or "pending"))
    rows = q.order_by(GroupInvite.created_at.desc()).offset(max(0, (page - 1) * page_size)).limit(min(200, page_size)).all()
    items = [
        {"id": x.id, "via": x.invitee_claim_type, "value": x.invitee_claim_value, "status": x.status, "created_at": str(x.created_at)}
        for x in rows
    ]
    return {"items": items}


@router.get("/invites/incoming")
def list_incoming_group_invites(current_user: User = Depends(get_current_user), db: Session = Depends(get_db), status_filter: str | None = None, page: int = 1, page_size: int = 50) -> dict:
    """
    List group invites that the current user has received.
    This allows users to see all group invitations sent to them.
    Includes both invites sent directly to the user ID and invites sent to their email address.
    """
    from sqlalchemy import or_, and_
    
    # Build query to include both:
    # 1. Invites sent directly to the user (invitee_user_id == current_user.id)
    # 2. Invites sent to the user's email address (invitee_user_id is None AND invitee_claim_value matches user's email)
    conditions = [GroupInvite.invitee_user_id == current_user.id]
    
    # Add condition for invites sent to user's email address
    if current_user.email:
        conditions.append(
            and_(
                GroupInvite.invitee_user_id.is_(None),
                GroupInvite.invitee_claim_type == "email",
                GroupInvite.invitee_claim_value == current_user.email.lower()
            )
        )
    
    q = db.query(GroupInvite).filter(or_(*conditions))
    if status_filter:
        q = q.filter(GroupInvite.status == status_filter)
    else:
        # Default to showing pending invites
        q = q.filter(GroupInvite.status == "pending")
    
    rows = q.order_by(GroupInvite.created_at.desc()).offset(max(0, (page - 1) * page_size)).limit(min(200, page_size)).all()
    
    items = []
    for invite in rows:
        # Get group details
        group = db.get(Group, invite.group_id)
        if not group:
            continue
            
        # Get inviter details
        inviter = db.get(User, invite.inviter_id)
        inviter_name = None
        if inviter:
            inviter_name = inviter.display_name or inviter.email
        
        items.append({
            "id": invite.id,
            "group_id": invite.group_id,
            "group_name": group.name,
            "group_description": group.description,
            "inviter_id": invite.inviter_id,
            "inviter_name": inviter_name,
            "status": invite.status,
            "created_at": str(invite.created_at),
            "expires_at": str(invite.ttl_at)
        })
    
    return {"items": items}


@router.post("/{group_id}/invites/{invite_id}/cancel")
def cancel_group_invite(group_id: str, invite_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    g = db.get(Group, group_id)
    if not g:
        raise HTTPException(status_code=404)
    inviter_mem = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == current_user.id).first()
    if not inviter_mem or inviter_mem.status != "active":
        if not has_permission(current_user, "admin.full_access"):
            raise HTTPException(status_code=403, detail={"error": FORBIDDEN})
    inv = _get_group_invite_or_410(db, invite_id)
    if inv.group_id != group_id:
        raise HTTPException(status_code=404)
    if g.invite_policy == "owner" and inviter_mem.role != GroupRole.OWNER and inv.inviter_id != current_user.id:
        if not has_permission(current_user, "admin.full_access"):
            raise HTTPException(status_code=403, detail={"error": FORBIDDEN})
    if inv.status != "pending":
        return {"status": inv.status}
    inv.status = "canceled"
    db.add(inv)
    write_audit(db, current_user.id, "group_invite", inv.id, "cancel", {})
    db.commit()
    return {"status": "canceled"}


@router.post("/{group_id}/invites/{invite_id}/resend")
def resend_group_invite(group_id: str, invite_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    g = db.get(Group, group_id)
    if not g:
        raise HTTPException(status_code=404)
    inviter_mem = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == current_user.id).first()
    if not inviter_mem or inviter_mem.status != "active":
        if not has_permission(current_user, "admin.full_access"):
            raise HTTPException(status_code=403, detail={"error": FORBIDDEN})
    inv = _get_group_invite_or_410(db, invite_id)
    if inv.group_id != group_id:
        raise HTTPException(status_code=404)
    if inv.status != "pending":
        raise HTTPException(status_code=409, detail={"error": "not_pending"})
    if inv.invitee_user_id:
        enqueue_notification(db, inv.invitee_user_id, "group_invite", {"group_id": group_id, "invite_id": inv.id})
    if inv.invitee_claim_type == "email":
        send_group_invite_email.delay(inv.invitee_claim_value, inv.token, g.name, inviter_label=current_user.id)
    else:
        send_group_invite_sms.delay(inv.invitee_claim_value, inv.token, g.name, inviter_label=current_user.id)
    write_audit(db, current_user.id, "group_invite", inv.id, "resend", {})
    db.commit()
    return {"status": "resent"}

@router.post("/invites/{invite_id}/accept")
def accept_group_invite(invite_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    inv = _get_group_invite_or_410(db, invite_id)
    if inv.invitee_user_id and inv.invitee_user_id != current_user.id:
        raise HTTPException(status_code=403, detail={"error": FORBIDDEN})
    if not inv.invitee_user_id:
        if inv.invitee_claim_type == "email":
            if not current_user.email or current_user.email.lower() != inv.invitee_claim_value:
                raise HTTPException(status_code=403, detail={"error": FORBIDDEN})
        else:
            if not current_user.phone or current_user.phone != inv.invitee_claim_value:
                raise HTTPException(status_code=403, detail={"error": FORBIDDEN})
        inv.invitee_user_id = current_user.id
    gm = db.query(GroupMember).filter(GroupMember.group_id == inv.group_id, GroupMember.user_id == current_user.id).first()
    if not gm:
        gm = GroupMember(id=f"{inv.group_id}:{current_user.id}", group_id=inv.group_id, user_id=current_user.id, role=GroupRole.MEMBER, status="active")
    else:
        gm.status = "active"
    inv.status = "accepted"
    db.add(gm)
    db.add(inv)
    write_audit(db, current_user.id, "group_member", gm.id, "accept", {})
    members = db.query(GroupMember).filter(GroupMember.group_id == inv.group_id, GroupMember.status == "active").all()
    for m in members:
        append_sync(db, m.user_id, "group_member_accepted", "group_member", gm.id, {"group_id": inv.group_id, "group_name": db.get(Group, inv.group_id).name if db.get(Group, inv.group_id) else inv.group_id, "user_id": current_user.id})
        enqueue_notification(db, m.user_id, "member_added", {"group_id": inv.group_id, "user_id": current_user.id})
    db.commit()
    return {"group_id": inv.group_id, "member": {"user_id": current_user.id, "role": gm.role, "status": "active"}}


@router.post("/invites/accept-token/{token}")
def accept_group_invite_by_token(token: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    print(f"DEBUG: Processing group invite token: {token}")
    print(f"DEBUG: Current user: {current_user.id if current_user else 'None'}")
    
    inv = db.query(GroupInvite).filter(GroupInvite.token == token).first()
    if not inv:
        print(f"DEBUG: Group invite not found for token: {token}")
        raise HTTPException(status_code=404, detail={"error": INVITE_NOT_FOUND})
    
    print(f"DEBUG: Found group invite: {inv.id}, status: {inv.status}, inviter: {inv.inviter_id}")
    
    # Check if invite is expired
    from datetime import datetime, timezone
    if inv.ttl_at < datetime.now(timezone.utc):
        print(f"DEBUG: Group invite expired at: {inv.ttl_at}")
        raise HTTPException(status_code=410, detail={"error": EXPIRED})
    
    # Check if invite is already processed
    if inv.status != "pending":
        print(f"DEBUG: Group invite already processed with status: {inv.status}")
        raise HTTPException(status_code=409, detail={"error": "already_processed"})
    
    result = accept_group_invite(inv.id, current_user, db)
    result["inviter_id"] = inv.inviter_id
    
    # Get inviter details directly
    inviter = db.get(User, inv.inviter_id)
    if inviter:
        result["inviter_email"] = inviter.email
        result["inviter_display_name"] = inviter.display_name
    
    return result


@router.post("/invites/{invite_id}/decline")
def decline_group_invite(invite_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    inv = _get_group_invite_or_410(db, invite_id)
    
    # Validate that the current user is authorized to decline this invite
    if inv.invitee_user_id and inv.invitee_user_id != current_user.id:
        raise HTTPException(status_code=403, detail={"error": FORBIDDEN})
    if not inv.invitee_user_id:
        if inv.invitee_claim_type == "email":
            if not current_user.email or current_user.email.lower() != inv.invitee_claim_value:
                raise HTTPException(status_code=403, detail={"error": FORBIDDEN})
        else:
            if not current_user.phone or current_user.phone != inv.invitee_claim_value:
                raise HTTPException(status_code=403, detail={"error": FORBIDDEN})
    
    inv.status = "declined"
    db.add(inv)
    gm = db.query(GroupMember).filter(GroupMember.group_id == inv.group_id, GroupMember.user_id == inv.invitee_user_id).first()
    if gm and gm.status == "invited":
        gm.status = "removed"
        db.add(gm)
    write_audit(db, current_user.id, "group_invite", inv.id, "decline", {})
    db.commit()
    return {"status": "declined"}


@router.post("/{group_id}/members/{user_id}/remove")
def remove_member(group_id: str, user_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    g = db.get(Group, group_id)
    if not g:
        raise HTTPException(status_code=404)
    if g.owner_id != current_user.id and not has_permission(current_user, "admin.full_access"):
        raise HTTPException(status_code=403, detail={"error": FORBIDDEN})
    
    # Prevent removing the owner
    if g.owner_id == user_id:
        raise HTTPException(status_code=403, detail={"error": CANNOT_REMOVE_OWNER})
    
    gm = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == user_id).first()
    if not gm:
        return {"status": "removed"}
    try:
        balances = calculate_group_balances(group_id, db)
        member_balance = next((b for b in balances if getattr(b, "user_id", None) == user_id), None)
        if member_balance and getattr(member_balance, "balance_inr", 0) != 0:
            raise HTTPException(status_code=409, detail={"error": PENDING_DUES})
    except Exception:
        pass
    gm.status = "removed"
    db.add(gm)
    write_audit(db, current_user.id, "group_member", gm.id, "remove", {})
    members = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.status == "active").all()
    for m in members:
        append_sync(db, m.user_id, "group_member_removed", "group_member", gm.id, {"group_id": group_id, "user_id": user_id})
        enqueue_notification(db, m.user_id, "member_removed", {"group_id": group_id, "user_id": user_id})
    enqueue_notification(db, user_id, "member_removed", {"group_id": group_id, "user_id": user_id})
    db.commit()
    return {"status": "removed"}


@router.post("/{group_id}/members/{user_id}/role")
def set_role(group_id: str, user_id: str, body: GroupRoleChangeRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    g = db.get(Group, group_id)
    if not g:
        raise HTTPException(status_code=404)
    if g.owner_id != current_user.id and not has_permission(current_user, "admin.full_access"):
        raise HTTPException(status_code=403, detail={"error": FORBIDDEN})
    if body.role == "owner":
        gm_target = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == user_id, GroupMember.status == "active").first()
        if not gm_target:
            raise HTTPException(status_code=400)
        current_owner_gm = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == current_user.id).first()
        current_owner_gm.role = GroupRole.MEMBER
        gm_target.role = GroupRole.OWNER
        g.owner_id = user_id
        db.add_all([g, gm_target, current_owner_gm])
        write_audit(db, current_user.id, "group", group_id, "transfer_owner", {"to": user_id})
        members = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.status == "active").all()
        for m in members:
            append_sync(db, m.user_id, "group_owner_transferred", "group", group_id, {"owner_id": user_id})
            enqueue_notification(db, m.user_id, "role_changed", {"group_id": group_id, "user_id": user_id, "role": GroupRole.OWNER})
        db.commit()
        return {"status": "ok"}
    else:
        gm = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == user_id).first()
        if not gm:
            raise HTTPException(status_code=400)
        gm.role = GroupRole.MEMBER
        db.add(gm)
        write_audit(db, current_user.id, "group_member", gm.id, "role_change", {"role": gm.role})
        members = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.status == "active").all()
        for m in members:
            enqueue_notification(db, m.user_id, "role_changed", {"group_id": group_id, "user_id": user_id, "role": gm.role})
        db.commit()
        return {"status": "ok"}


@router.post("/{group_id}/transfer-ownership")
def transfer_ownership(group_id: str, body: TransferOwnershipRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    g = db.get(Group, group_id)
    if not g:
        raise HTTPException(status_code=404)
    if g.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail={"error": FORBIDDEN})
    
    # Check if new owner is a valid active member
    new_owner_gm = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == body.new_owner_id,
        GroupMember.status == "active"
    ).first()
    
    if not new_owner_gm:
        raise HTTPException(status_code=400, detail={"error": USER_NOT_MEMBER})
    
    # Get current owner's membership record
    current_owner_gm = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
        GroupMember.status == "active"
    ).first()
    
    if not current_owner_gm:
        raise HTTPException(status_code=400, detail={"error": "owner_not_member"})
    
    # Transfer ownership
    g.owner_id = body.new_owner_id
    new_owner_gm.role = GroupRole.OWNER
    current_owner_gm.role = GroupRole.MEMBER
    
    db.add_all([g, new_owner_gm, current_owner_gm])
    write_audit(db, current_user.id, "group", group_id, "transfer_owner", {"to": body.new_owner_id})
    
    # Notify all members
    members = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.status == "active").all()
    for m in members:
        append_sync(db, m.user_id, "group_owner_transferred", "group", group_id, {"owner_id": body.new_owner_id})
        enqueue_notification(db, m.user_id, "role_changed", {"group_id": group_id, "user_id": body.new_owner_id, "role": GroupRole.OWNER})
    
    db.commit()
    return {"status": "transferred", "new_owner_id": body.new_owner_id}


@router.post("/{group_id}/leave")
def leave_group(group_id: str, body: LeaveGroupRequest = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    g = db.get(Group, group_id)
    if not g:
        raise HTTPException(status_code=404)
    
    # Prevent leaving if user has pending dues in this group (applies to ALL users, including owners)
    try:
        balances = calculate_group_balances(group_id, db)
        my_balance = next((b for b in balances if getattr(b, "user_id", None) == current_user.id), None)
        if my_balance and getattr(my_balance, "balance_inr", 0) != 0:
            raise HTTPException(status_code=409, detail={"error": PENDING_DUES})
    except HTTPException:
        raise
    except Exception:
        pass
    
    if g.owner_id == current_user.id:
        others = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id != current_user.id, GroupMember.status == "active").all()
        
        if others:
            if body and body.transfer_to:
                # Transfer to specified user
                new_owner = next((m for m in others if m.user_id == body.transfer_to), None)
                if not new_owner:
                    raise HTTPException(status_code=400, detail={"error": INVALID_NEW_OWNER})
                
                # Transfer ownership
                g.owner_id = body.transfer_to
                new_owner.role = GroupRole.OWNER
                current_owner_gm = db.query(GroupMember).filter(
                    GroupMember.group_id == group_id,
                    GroupMember.user_id == current_user.id,
                    GroupMember.status == "active"
                ).first()
                if current_owner_gm:
                    current_owner_gm.role = GroupRole.MEMBER
                    current_owner_gm.status = "left"
                    db.add_all([g, new_owner, current_owner_gm])
                    write_audit(db, current_user.id, "group", group_id, "transfer_owner_and_leave", {"to": body.transfer_to})
                    
                    # Notify all members
                    for m in others:
                        append_sync(db, m.user_id, "group_owner_transferred", "group", group_id, {"owner_id": body.transfer_to})
                        enqueue_notification(db, m.user_id, "role_changed", {"group_id": group_id, "user_id": body.transfer_to, "role": GroupRole.OWNER})
                    
                    db.commit()
                    return {"status": "left", "ownership_transferred_to": body.transfer_to}
            else:
                # Return available members for transfer
                available_members = [{"user_id": m.user_id, "display_name": m.user.display_name, "email": m.user.email} for m in others]
                raise HTTPException(status_code=409, detail={
                    "error": OWNER_MUST_TRANSFER,
                    "available_members": available_members
                })
        else:
            # Archive group if no other members
            g.archived_at = dt.datetime.now(dt.timezone.utc)
            db.add(g)
            for m in db.query(GroupMember).filter(GroupMember.group_id == group_id).all():
                m.status = "removed"
                db.add(m)
            write_audit(db, current_user.id, "group", group_id, "archive", {})
            for m in db.query(GroupMember).filter(GroupMember.group_id == group_id).all():
                append_sync(db, m.user_id, "group_archived", "group", group_id, {"actor_id": current_user.id, "actor_name": (current_user.display_name or current_user.email)})
            db.commit()
            return {"status": "left", "group_archived": True}

    gm = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == current_user.id).first()
    if gm:
        gm.status = "left"
        db.add(gm)
        write_audit(db, current_user.id, "group_member", gm.id, "leave", {})
        members = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.status == "active").all()
        for m in members:
            append_sync(db, m.user_id, "group_member_left", "group_member", gm.id, {"group_id": group_id, "group_name": g.name, "user_id": current_user.id})
            enqueue_notification(db, m.user_id, "member_removed", {"group_id": group_id, "user_id": current_user.id})
        db.commit()
    return {"status": "left"}


@router.delete("/{group_id}")
def archive_group(group_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    g = db.get(Group, group_id)
    if not g:
        raise HTTPException(status_code=404)
    if g.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail={"error": FORBIDDEN})
    has_expenses = group_has_expenses(db, group_id)
    if has_expenses:
        raise HTTPException(status_code=409, detail={"error": GROUP_HAS_EXPENSES})
    g.archived_at = dt.datetime.now(dt.timezone.utc)
    db.add(g)
    for m in db.query(GroupMember).filter(GroupMember.group_id == group_id).all():
        m.status = "removed"
        db.add(m)
    write_audit(db, current_user.id, "group", group_id, "archive", {})
    for m in db.query(GroupMember).filter(GroupMember.group_id == group_id).all():
        append_sync(db, m.user_id, "group_archived", "group", group_id, {"actor_id": current_user.id, "actor_name": (current_user.display_name or current_user.email)})
    db.commit()
    return {"status": "archived"}
