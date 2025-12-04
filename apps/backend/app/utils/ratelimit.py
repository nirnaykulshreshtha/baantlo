from __future__ import annotations
import time
from redis import Redis


def sliding_window_allow(r: Redis, key: str, window_seconds: int, limit: int) -> tuple[bool, int]:
    now = int(time.time())
    r.zremrangebyscore(key, 0, now - window_seconds)
    count = r.zcard(key)
    if count >= limit:
        oldest = r.zrange(key, 0, 0, withscores=True)
        reset_in = 0
        if oldest and len(oldest[0]) == 2:
            oldest_ts = int(oldest[0][1])
            reset_in = max(0, (oldest_ts + window_seconds) - now)
        return False, reset_in
    r.zadd(key, {str(now): now})
    r.expire(key, window_seconds)
    return True, 0


