from __future__ import annotations
from datetime import datetime, timezone
from app.celery_app import celery_app
from app.db.session import SessionLocal
from app.db.models import FriendInvite, GroupInvite


@celery_app.task(name="app.tasks.cleanup.expire_invites")
def expire_invites():
	with SessionLocal() as db:
		now = datetime.now(timezone.utc)
		for model in (FriendInvite, GroupInvite):
			rows = db.query(model).filter(model.status == "pending", model.ttl_at < now).all()
			for r in rows:
				r.status = "expired"
				db.add(r)
		db.commit()
