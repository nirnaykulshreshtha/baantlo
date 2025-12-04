from functools import lru_cache
from redis import Redis
from fastapi import Depends
from .config import settings


@lru_cache(maxsize=1)
def get_redis() -> Redis:
    return Redis.from_url(
        str(settings.redis_url),
        decode_responses=True,
        socket_timeout=settings.redis_socket_timeout,
        socket_connect_timeout=settings.redis_socket_connect_timeout,
        health_check_interval=settings.redis_health_check_interval,
        retry_on_timeout=False,
    )


def get_redis_dependency() -> Redis:
    """FastAPI dependency for Redis connection."""
    return get_redis()
