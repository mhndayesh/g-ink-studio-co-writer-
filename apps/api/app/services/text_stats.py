"""Real word counting + per-day writing stats.

The old hub stats used `len(content)//5`, which is not a word count and
disagreed with every other surface. Everything now goes through this module.
"""
from __future__ import annotations

import re
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import WritingDay

# Unicode-aware: letters/digits plus internal apostrophes/hyphens.
_WORD_RE = re.compile(r"\b[\w'-]+\b", re.UNICODE)


def count_words(text: str | None) -> int:
    return len(_WORD_RE.findall(text or ""))


def _today() -> str:
    return datetime.now(timezone.utc).date().isoformat()


async def record_delta(db: AsyncSession, story_id: str, delta: int) -> None:
    """Accumulate a word delta into today's row (no commit)."""
    if not delta:
        return
    day = _today()
    row = (
        await db.execute(
            select(WritingDay).where(WritingDay.story_id == story_id, WritingDay.day == day)
        )
    ).scalar_one_or_none()
    if row is None:
        db.add(WritingDay(story_id=story_id, day=day, words=int(delta)))
    else:
        row.words = int(row.words or 0) + int(delta)


async def daily_stats(db: AsyncSession, story_id: str, days: int = 30) -> dict:
    """Return words written today, the current streak, and the daily series."""
    rows = (
        await db.execute(
            select(WritingDay).where(WritingDay.story_id == story_id).order_by(WritingDay.day)
        )
    ).scalars().all()
    by_day = {r.day: int(r.words or 0) for r in rows}
    today = datetime.now(timezone.utc).date()
    words_today = by_day.get(today.isoformat(), 0)

    streak = 0
    cursor = today
    while by_day.get(cursor.isoformat(), 0) > 0:
        streak += 1
        cursor -= timedelta(days=1)

    start = today - timedelta(days=max(1, days) - 1)
    series = []
    for i in range(max(1, days)):
        d = start + timedelta(days=i)
        series.append({"day": d.isoformat(), "words": by_day.get(d.isoformat(), 0)})
    return {"words_today": words_today, "streak_days": streak, "series": series}


def parse_day(value: str) -> date:
    return date.fromisoformat(value)
