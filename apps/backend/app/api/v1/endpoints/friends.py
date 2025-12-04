from __future__ import annotations
import datetime as dt
from fastapi import APIRouter, Depends, HTTPException, status
from redis import Redis
from sqlalchemy.orm import Session
from ....auth.deps import get_current_user
from ....core.redis import get_redis
from ....db.deps import get_db
from ....db.models import User, FriendInvite, Friendship
from ....services.audit import write_audit
from ....services.notify import enqueue_notification
from ....services.sync import append_sync
from ....services.idempotency import with_idempotency
from ....tasks.notify import send_friend_invite_email
from ....utils.identity import normalize_email, normalize_phone_e164
from ....utils.ids import generate_token_128b
from ....utils.ratelimit import sliding_window_allow
from ..errors import RATE_LIMITED, ALREADY_FRIENDS, INVITE_EXISTS, BLOCKED, INVITE_NOT_FOUND, GONE
from ..schemas import FriendInviteRequest


router = APIRouter()


@router.post("/invites")
def create_friend_invite(body: FriendInviteRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db), r: Redis = Depends(get_redis)) -> dict:
    via = body.via
    value = body.value
    client_request_id = body.client_request_id
    rl_key = f"rl:friend_invite:{current_user.id}"
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
        existing_user = db.query(User).filter((User.email == claim_value) if via == "email" else (User.phone == claim_value)).first()
        if existing_user and existing_user.id == current_user.id:
            raise HTTPException(status_code=409, detail={"error": ALREADY_FRIENDS})
        if existing_user:
            a = min(current_user.id, existing_user.id)
            b = max(current_user.id, existing_user.id)
            fs = db.query(Friendship).filter(Friendship.user_a == a, Friendship.user_b == b).first()
            if fs and fs.status == "blocked":
                raise HTTPException(status_code=409, detail={"error": BLOCKED})
            if fs and fs.status == "accepted":
                raise HTTPException(status_code=409, detail={"error": ALREADY_FRIENDS})
            rev = db.query(FriendInvite).filter(
                FriendInvite.inviter_id == existing_user.id,
                FriendInvite.invitee_user_id.in_([current_user.id, None]),
                FriendInvite.invitee_claim_type == ("email" if via == "email" else "phone"),
                FriendInvite.status == "pending",
            ).first()
            if rev:
                a = min(current_user.id, existing_user.id)
                b = max(current_user.id, existing_user.id)
                fs2 = db.query(Friendship).filter(Friendship.user_a == a, Friendship.user_b == b).first()
                if not fs2:
                    fs2 = Friendship(id=generate_token_128b(), user_a=a, user_b=b, status="accepted", initiator=rev.inviter_id)
                    db.add(fs2)
                else:
                    fs2.status = "accepted"
                    db.add(fs2)
                rev.status = "accepted"
                db.add(rev)
                write_audit(db, current_user.id, "friendship", fs2.id, "auto_accept", {})
                db.flush()
                append_sync(db, rev.inviter_id, "friendship_created", "friendship", fs2.id, {"user_id": current_user.id})
                append_sync(db, current_user.id, "friendship_created", "friendship", fs2.id, {"user_id": rev.inviter_id})
                return {"invite_id": rev.id, "status": "accepted"}
        pending = db.query(FriendInvite).filter(
            FriendInvite.inviter_id == current_user.id,
            FriendInvite.invitee_claim_type == via,
            FriendInvite.invitee_claim_value == claim_value,
            FriendInvite.status == "pending",
        ).first()
        if pending:
            return {"invite_id": pending.id, "status": pending.status}
        token = generate_token_128b()
        inv = FriendInvite(
            id=generate_token_128b(),
            inviter_id=current_user.id,
            invitee_user_id=existing_user.id if existing_user else None,
            invitee_claim_type=via,
            invitee_claim_value=claim_value,
            status="pending",
            token=token,
            ttl_at=dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=7),
        )
        db.add(inv)
        db.flush()
        write_audit(db, current_user.id, "friend_invite", inv.id, "invite", {})
        if existing_user:
            enqueue_notification(db, existing_user.id, "friend_request", {"invite_id": inv.id})
            append_sync(db, existing_user.id, "friend_invite_created", "friend_invite", inv.id, {"inviter_id": current_user.id, "inviter_name": (current_user.display_name or current_user.email)})
            if existing_user.email:
                send_friend_invite_email.delay(existing_user.email, inv.token, inviter_label=current_user.id)
        else:
            if via == "email":
                send_friend_invite_email.delay(claim_value, inv.token, inviter_label=current_user.id)
        append_sync(db, current_user.id, "friend_invite_created", "friend_invite", inv.id, {"invitee": claim_value, "via": via})
        db.commit()
        return {"invite_id": inv.id, "status": inv.status}

    return with_idempotency(db, current_user.id, client_request_id, _handle)


@router.get("/invites")
def list_friend_invites(status_filter: str | None = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db), page: int = 1, page_size: int = 50) -> dict:
    q = db.query(FriendInvite).filter(FriendInvite.status == (status_filter or "pending"))
    q = q.filter((FriendInvite.inviter_id == current_user.id) | (FriendInvite.invitee_user_id == current_user.id))
    rows = q.order_by(FriendInvite.created_at.desc()).offset(max(0, (page - 1) * page_size)).limit(min(200, page_size)).all()
    items = [
        {
            "id": x.id,
            "via": x.invitee_claim_type,
            "value": x.invitee_claim_value,
            "status": x.status,
            "created_at": str(x.created_at),
        }
        for x in rows
    ]
    return {"items": items}


@router.post("/invites/{invite_id}/resend")
def resend_friend_invite(invite_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    inv = db.get(FriendInvite, invite_id)
    if not inv:
        raise HTTPException(status_code=404, detail={"error": INVITE_NOT_FOUND})
    if inv.inviter_id != current_user.id:
        raise HTTPException(status_code=403)
    if inv.status != "pending":
        raise HTTPException(status_code=409, detail={"error": "not_pending"})
    if inv.invitee_user_id:
        enqueue_notification(db, inv.invitee_user_id, "friend_request", {"invite_id": inv.id})
    if inv.invitee_claim_type == "email":
        send_friend_invite_email.delay(inv.invitee_claim_value, inv.token, inviter_label=current_user.id)
    write_audit(db, current_user.id, "friend_invite", inv.id, "resend", {})
    db.commit()
    return {"status": "resent"}


@router.post("/invites/{invite_id}/cancel")
def cancel_friend_invite(invite_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    inv = db.get(FriendInvite, invite_id)
    if not inv:
        raise HTTPException(status_code=404, detail={"error": INVITE_NOT_FOUND})
    if inv.inviter_id != current_user.id:
        raise HTTPException(status_code=403)
    if inv.status != "pending":
        return {"status": inv.status}
    inv.status = "canceled"
    db.add(inv)
    write_audit(db, current_user.id, "friend_invite", inv.id, "cancel", {})
    db.commit()
    return {"status": "canceled"}


def _get_invite_or_410(db: Session, invite_id: str) -> FriendInvite:
    inv = db.get(FriendInvite, invite_id)
    if not inv:
        raise HTTPException(status_code=404, detail={"error": INVITE_NOT_FOUND})
    if inv.status == "pending" and inv.ttl_at and inv.ttl_at < dt.datetime.now(dt.timezone.utc):
        inv.status = "expired"
        db.add(inv)
        db.flush()
        raise HTTPException(status_code=410, detail={"error": GONE})
    return inv


@router.post("/invites/{invite_id}/accept")
def accept_friend_invite(invite_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    inv = _get_invite_or_410(db, invite_id)
    if inv.invitee_user_id and inv.invitee_user_id != current_user.id:
        raise HTTPException(status_code=403, detail={"error": "forbidden"})
    if not inv.invitee_user_id:
        if inv.invitee_claim_type == "email" and current_user.email and current_user.email.lower() == inv.invitee_claim_value:
            inv.invitee_user_id = current_user.id
        elif inv.invitee_claim_type == "phone" and current_user.phone and current_user.phone == inv.invitee_claim_value:
            inv.invitee_user_id = current_user.id
        else:
            raise HTTPException(status_code=403, detail={"error": "claim_mismatch"})
    a = min(current_user.id, inv.inviter_id)
    b = max(current_user.id, inv.inviter_id)
    fs = db.query(Friendship).filter(Friendship.user_a == a, Friendship.user_b == b).first()
    if fs and fs.status == "blocked":
        raise HTTPException(status_code=409, detail={"error": BLOCKED})
    if not fs:
        fs = Friendship(id=generate_token_128b(), user_a=a, user_b=b, status="accepted", initiator=inv.inviter_id)
        db.add(fs)
    else:
        fs.status = "accepted"
        db.add(fs)
    inv.status = "accepted"
    db.add(inv)
    write_audit(db, current_user.id, "friendship", fs.id, "accept", {})
    enqueue_notification(db, inv.inviter_id, "friend_accept", {"friendship_id": fs.id})
    append_sync(db, inv.inviter_id, "friendship_created", "friendship", fs.id, {"user_id": current_user.id, "user_name": (current_user.display_name or current_user.email)})
    append_sync(db, current_user.id, "friendship_created", "friendship", fs.id, {"user_id": inv.inviter_id, "user_name": (db.get(User, inv.inviter_id).display_name or db.get(User, inv.inviter_id).email) if db.get(User, inv.inviter_id) else inv.inviter_id})
    db.commit()
    return {"friendship_id": fs.id, "status": "accepted"}


@router.post("/invites/accept-token/{token}")
def accept_friend_invite_by_token(token: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    print(f"DEBUG: Processing friend invite token: {token}")
    print(f"DEBUG: Current user: {current_user.id if current_user else 'None'}")
    
    inv = db.query(FriendInvite).filter(FriendInvite.token == token).first()
    if not inv:
        print(f"DEBUG: Friend invite not found for token: {token}")
        raise HTTPException(status_code=404, detail={"error": INVITE_NOT_FOUND})
    
    print(f"DEBUG: Found friend invite: {inv.id}, status: {inv.status}, inviter: {inv.inviter_id}")
    
    # Check if invite is expired
    from datetime import datetime, timezone
    if inv.ttl_at < datetime.now(timezone.utc):
        print(f"DEBUG: Friend invite expired at: {inv.ttl_at}")
        raise HTTPException(status_code=410, detail={"error": EXPIRED})
    
    # Check if invite is already processed
    if inv.status != "pending":
        print(f"DEBUG: Friend invite already processed with status: {inv.status}")
        raise HTTPException(status_code=409, detail={"error": "already_processed"})
    
    result = accept_friend_invite(inv.id, current_user, db)
    result["inviter_id"] = inv.inviter_id
    
    # Get inviter details directly
    inviter = db.get(User, inv.inviter_id)
    if inviter:
        result["inviter_email"] = inviter.email
        result["inviter_display_name"] = inviter.display_name
    
    return result


@router.post("/invites/{invite_id}/decline")
def decline_friend_invite(invite_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    inv = _get_invite_or_410(db, invite_id)
    if inv.invitee_user_id and inv.invitee_user_id != current_user.id:
        raise HTTPException(status_code=403, detail={"error": "forbidden"})
    inv.status = "declined"
    db.add(inv)
    write_audit(db, current_user.id, "friend_invite", inv.id, "decline", {})
    append_sync(db, inv.inviter_id, "friend_invite_declined", "friend_invite", inv.id, {})
    append_sync(db, current_user.id, "friend_invite_declined", "friend_invite", inv.id, {})
    db.commit()
    return {"status": "declined"}


@router.get("")
def list_friends(current_user: User = Depends(get_current_user), db: Session = Depends(get_db), page: int = 1, page_size: int = 50) -> dict:
    rows_q = db.query(Friendship).filter(
        (Friendship.user_a == current_user.id) | (Friendship.user_b == current_user.id),
        Friendship.status == "accepted",
    )
    rows = rows_q.order_by(Friendship.created_at.desc()).offset(max(0, (page - 1) * page_size)).limit(min(200, page_size)).all()
    items = []
    for fs in rows:
        friend_id = fs.user_b if fs.user_a == current_user.id else fs.user_a
        friend_user = db.query(User).filter(User.id == friend_id).first()
        friend_name = friend_user.display_name or friend_user.email if friend_user else "Unknown"
        items.append({"user_id": friend_id, "user_name": friend_name, "since": str(fs.created_at), "status": fs.status})

    pending_invites = db.query(FriendInvite).filter(
        FriendInvite.inviter_id == current_user.id,
        FriendInvite.status == "pending",
    ).all()
    for inv in pending_invites:
        label = inv.invitee_user_id or inv.invitee_claim_value
        items.append({
            "user_id": label,
            "status": "pending",
            "invite_id": inv.id,
            "via": inv.invitee_claim_type,
            "created_at": str(inv.created_at),
        })
    return {"items": items}


@router.delete("/{friend_user_id}")
def delete_friend(friend_user_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    a = min(current_user.id, friend_user_id)
    b = max(current_user.id, friend_user_id)
    fs = db.query(Friendship).filter(Friendship.user_a == a, Friendship.user_b == b).first()
    if not fs:
        return {"status": "removed"}
    fs.status = "declined"
    db.add(fs)
    write_audit(db, current_user.id, "friendship", fs.id, "remove", {})
    by_name = current_user.display_name or current_user.email
    append_sync(db, current_user.id, "friend_removed", "friendship", fs.id, {"by": current_user.id, "by_name": by_name})
    append_sync(db, friend_user_id, "friend_removed", "friendship", fs.id, {"by": current_user.id, "by_name": by_name})
    enqueue_notification(db, friend_user_id, "friend_removed", {"by": current_user.id})
    db.commit()
    return {"status": "removed"}


@router.post("/{friend_user_id}/block")
def block_user(friend_user_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    a = min(current_user.id, friend_user_id)
    b = max(current_user.id, friend_user_id)
    fs = db.query(Friendship).filter(Friendship.user_a == a, Friendship.user_b == b).first()
    if not fs:
        fs = Friendship(id=generate_token_128b(), user_a=a, user_b=b, status="blocked", initiator=current_user.id)
    else:
        fs.status = "blocked"
    db.add(fs)
    # cancel pending invites both directions
    for inv in db.query(FriendInvite).filter(
        ((FriendInvite.inviter_id == current_user.id) & (FriendInvite.invitee_user_id == friend_user_id))
        | ((FriendInvite.inviter_id == friend_user_id) & (FriendInvite.invitee_user_id == current_user.id)),
        FriendInvite.status == "pending",
    ).all():
        inv.status = "canceled"
        db.add(inv)
    write_audit(db, current_user.id, "friendship", fs.id, "block", {})
    append_sync(db, current_user.id, "user_blocked", "friendship", fs.id, {})
    append_sync(db, friend_user_id, "user_blocked", "friendship", fs.id, {})
    enqueue_notification(db, friend_user_id, "user_blocked", {"by": current_user.id})
    db.commit()
    return {"status": "blocked"}



@router.post("/{friend_user_id}/unblock")
def unblock_user(friend_user_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    a = min(current_user.id, friend_user_id)
    b = max(current_user.id, friend_user_id)
    fs = db.query(Friendship).filter(Friendship.user_a == a, Friendship.user_b == b).first()
    if not fs:
        return {"status": "unblocked"}
    if fs.status != "blocked":
        return {"status": "unblocked"}
    fs.status = "declined"
    db.add(fs)
    write_audit(db, current_user.id, "friendship", fs.id, "unblock", {})
    append_sync(db, current_user.id, "user_unblocked", "friendship", fs.id, {})
    append_sync(db, friend_user_id, "user_unblocked", "friendship", fs.id, {})
    enqueue_notification(db, friend_user_id, "user_unblocked", {"by": current_user.id})
    db.commit()
    return {"status": "unblocked"}


