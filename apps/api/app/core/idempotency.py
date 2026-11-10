"""Idempotency for client-initiated mutations that aren't naturally idempotent.

Flow `approve` and publish `push` each create new rows every time they run. A
retry after a flaky-connection timeout must not double-commit.

Protocol (reserve-first):

  1. `reserve()` inserts a placeholder row keyed on (user_id, scope, key) with a
     hash of the request payload, and COMMITS it before the work runs. That
     closes the check-then-act window: a concurrent retry loses the unique race
     and either replays a completed response or gets 409 "in progress".
  2. `complete()` stores the response on the same row after the work commits.
  3. `release()` deletes the placeholder when the work fails, so the writer can
     retry immediately.

A reused key with a *different* payload is rejected (409) instead of silently
returning the previous response. No-op when the header is absent.
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import Conflict
from app.db.models import IdempotencyKey

_MAX_KEY_LEN = 128


def _clean(key: str | None) -> str | None:
    if not key:
        return None
    key = key.strip()
    return key[:_MAX_KEY_LEN] or None


def payload_hash(payload: object) -> str:
    """Stable hash of a JSON-able request payload."""
    try:
        raw = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    except Exception:
        raw = repr(payload)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _conflict_for(row: IdempotencyKey | None) -> dict:
    if row is not None and not row.response:
        raise Conflict("An identical request is still in progress — retry shortly.")
    raise Conflict("This Idempotency-Key was already used with a different payload.")


async def reserve(
    db: AsyncSession,
    user_id: str,
    key: str | None,
    scope: str,
    request_hash: str,
) -> dict | None:
    """Reserve the key. Returns a stored response to replay, or None to proceed."""
    key = _clean(key)
    if key is None:
        return None

    async def _inspect() -> dict | None:
        row = (
            await db.execute(
                select(IdempotencyKey).where(
                    IdempotencyKey.user_id == user_id,
                    IdempotencyKey.scope == scope,
                    IdempotencyKey.idem_key == key,
                )
            )
        ).scalar_one_or_none()
        if row is None:
            return None
        if row.request_hash and row.request_hash != request_hash:
            raise Conflict("This Idempotency-Key was already used with a different payload.")
        if row.response:
            return row.response
        raise Conflict("An identical request is still in progress — retry shortly.")

    replay = await _inspect()
    if replay is not None:
        return replay

    db.add(
        IdempotencyKey(
            user_id=user_id,
            scope=scope,
            idem_key=key,
            response={},
            request_hash=request_hash,
        )
    )
    try:
        await db.commit()
        return None
    except IntegrityError:
        await db.rollback()
        replay = await _inspect()
        if replay is not None:
            return replay
        raise Conflict("An identical request is still in progress — retry shortly.")


async def complete(
    db: AsyncSession,
    user_id: str,
    key: str | None,
    scope: str,
    response: dict,
) -> None:
    key = _clean(key)
    if key is None:
        return
    row = (
        await db.execute(
            select(IdempotencyKey).where(
                IdempotencyKey.user_id == user_id,
                IdempotencyKey.scope == scope,
                IdempotencyKey.idem_key == key,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        row = IdempotencyKey(user_id=user_id, scope=scope, idem_key=key, response=response)
        db.add(row)
    else:
        row.response = response
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()


async def release(db: AsyncSession, user_id: str, key: str | None, scope: str) -> None:
    """Drop an unfinished reservation after a failed operation."""
    key = _clean(key)
    if key is None:
        return
    row = (
        await db.execute(
            select(IdempotencyKey).where(
                IdempotencyKey.user_id == user_id,
                IdempotencyKey.scope == scope,
                IdempotencyKey.idem_key == key,
            )
        )
    ).scalar_one_or_none()
    if row is not None and not row.response:
        await db.execute(delete(IdempotencyKey).where(IdempotencyKey.id == row.id))
    await db.commit()


# Backwards-compatible helpers (older call sites); new code uses reserve/complete.
async def replay(db: AsyncSession, user_id: str, key: str | None, scope: str) -> dict | None:
    key = _clean(key)
    if key is None:
        return None
    row = (
        await db.execute(
            select(IdempotencyKey).where(
                IdempotencyKey.user_id == user_id,
                IdempotencyKey.scope == scope,
                IdempotencyKey.idem_key == key,
            )
        )
    ).scalar_one_or_none()
    return row.response if row is not None and row.response else None


async def remember(db: AsyncSession, user_id: str, key: str | None, scope: str, response: dict) -> None:
    await complete(db, user_id, key, scope, response)


async def prune_expired(db: AsyncSession, max_age_days: int = 7) -> int:
    cutoff = datetime.now(timezone.utc) - timedelta(days=max_age_days)
    result = await db.execute(delete(IdempotencyKey).where(IdempotencyKey.created_at < cutoff))
    await db.commit()
    return result.rowcount or 0
