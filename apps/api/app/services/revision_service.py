"""Per-chapter revision history.

A revision is captured BEFORE a mutation, so the previous prose is always
recoverable. `restore` is itself reversible: it snapshots the current state
first, then applies the old revision.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFound
from app.db.models import Chapter, ChapterRevision
from app.services import text_stats

REVISION_RETENTION = 50
MANUAL_THROTTLE_SECONDS = 300


async def capture(
    db: AsyncSession,
    chapter: Chapter,
    *,
    source: str = "manual",
    note: str = "",
) -> ChapterRevision | None:
    """Snapshot the chapter's current state (no commit).

    Manual autosaves are throttled to one revision per 5 minutes, otherwise the
    retention window would only cover the last few minutes of typing. Flow
    overwrites and restores always capture.
    """
    if source == "manual":
        latest = (
            await db.execute(
                select(ChapterRevision.created_at)
                .where(ChapterRevision.chapter_id == chapter.id)
                .order_by(ChapterRevision.created_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        if latest is not None:
            latest_dt = latest if latest.tzinfo else latest.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) - latest_dt < timedelta(seconds=MANUAL_THROTTLE_SECONDS):
                return None

    row = ChapterRevision(
        story_id=chapter.story_id,
        chapter_id=chapter.id,
        title=chapter.title or "",
        content=chapter.content or "",
        summary=chapter.summary or "",
        word_count=chapter.word_count or text_stats.count_words(chapter.content),
        source=source,
        note=note[:255],
    )
    db.add(row)
    await db.flush()

    # Bound growth per chapter; keep the newest REVISION_RETENTION rows.
    old = (
        await db.execute(
            select(ChapterRevision.id)
            .where(ChapterRevision.chapter_id == chapter.id)
            .order_by(ChapterRevision.created_at.desc())
            .offset(REVISION_RETENTION)
        )
    ).scalars().all()
    if old:
        await db.execute(delete(ChapterRevision).where(ChapterRevision.id.in_(old)))
    return row


async def list_for_chapter(db: AsyncSession, story_id: str, chapter_id: str) -> list[ChapterRevision]:
    chapter = await db.get(Chapter, chapter_id)
    if chapter is None or chapter.story_id != story_id:
        raise NotFound("Chapter not found")
    return list(
        (
            await db.execute(
                select(ChapterRevision)
                .where(ChapterRevision.chapter_id == chapter_id)
                .order_by(ChapterRevision.created_at.desc())
            )
        ).scalars().all()
    )


async def restore(
    db: AsyncSession,
    story_id: str,
    chapter_id: str,
    revision_id: str,
) -> Chapter:
    chapter = await db.get(Chapter, chapter_id)
    if chapter is None or chapter.story_id != story_id:
        raise NotFound("Chapter not found")
    revision = await db.get(ChapterRevision, revision_id)
    if revision is None or revision.chapter_id != chapter_id:
        raise NotFound("Revision not found")

    await capture(db, chapter, source="restore", note=f"before restore {revision.id}")
    old_words = chapter.word_count or 0
    chapter.title = revision.title
    chapter.content = revision.content
    chapter.summary = revision.summary
    chapter.word_count = text_stats.count_words(revision.content)
    await text_stats.record_delta(db, story_id, chapter.word_count - old_words)
    return chapter
