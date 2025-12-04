from __future__ import annotations
from app.celery_app import celery_app
from app.db.session import SessionLocal
from app.db.models import NotificationOutbox
from app.core.config import settings
from smtplib import SMTP
from email.message import EmailMessage
from twilio.rest import Client


@celery_app.task(name="app.tasks.outbox.process")
def process_outbox(limit: int = 100):
    with SessionLocal() as db:
        rows = db.query(NotificationOutbox).filter(NotificationOutbox.status == "pending").order_by(NotificationOutbox.id.asc()).limit(limit).all()
        for r in rows:
            ok = False
            if r.type in {"friend_request", "friend_accept", "group_invite", "member_added", "member_removed", "role_changed"}:
                # placeholder push/email/SMS logic
                ok = True
            if ok:
                r.status = "sent"
            else:
                r.status = "failed"
            db.add(r)
        db.commit()


