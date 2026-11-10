"""Process-wide ARQ Redis pool.

The async-export endpoints used to call `arq.create_pool()` and `aclose()` on
every submit/status request — two extra Redis handshakes per poll, and a new
connection every time. Reuse one pool for the process lifetime and close it in
the FastAPI lifespan.
"""
from __future__ import annotations

import logging

from arq.connections import ArqRedis, create_pool

from app.workers import redis_settings

log = logging.getLogger("gink.worker.pool")

_pool: ArqRedis | None = None


async def get_pool() -> ArqRedis:
    """Return the shared pool, creating it on first use."""
    global _pool
    if _pool is None:
        _pool = await create_pool(redis_settings())
    return _pool


async def close_pool() -> None:
    """Close the shared pool (called from the API lifespan on shutdown)."""
    global _pool
    if _pool is not None:
        try:
            await _pool.aclose()
        finally:
            _pool = None
