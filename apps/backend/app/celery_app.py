from celery import Celery
from .core.config import settings
from celery.schedules import crontab


celery_app = Celery(
    "baantlo",
    broker=str(settings.redis_url),
    backend=str(settings.redis_url),
    include=["app.tasks.sample", "app.tasks.notify", "app.tasks.cleanup", "app.tasks.outbox_consumer"],
)


celery_app.conf.beat_schedule = {
    "process-outbox-every-minute": {
        "task": "app.tasks.outbox.process",
        "schedule": 60.0,
    },
}

