from fastapi import APIRouter, Query
from sqlalchemy import func, select

from app.core.deps import CurrentUser, DB, get_user_story
from app.core.errors import Conflict, NotFound, envelope_ok
from app.db.models import Chapter
from app.db.schemas import (
    ChapterIn,
    ChapterOut,
    ChapterPatch,
    ChapterReorderRequest,
    ChapterRevisionOut,
)
from app.services import revision_service, text_stats

router = APIRouter()


async def _number_taken(db, story_id: str, number: int, *, exclude_id: str | None = None) -> bool:
    stmt = select(Chapter.id).where(Chapter.story_id == story_id, Chapter.number == number)
    if exclude_id:
        stmt = stmt.where(Chapter.id != exclude_id)
    return (await db.scalar(stmt)) is not None


@router.get("/{story_id}/chapters")
async def list_chapters(
    story_id: str,
    user: CurrentUser,
    db: DB,
    limit: int | None = Query(None, ge=1, le=500, description="Opt-in page size; omit to return all."),
    offset: int = Query(0, ge=0),
):
    await get_user_story(story_id, user, db)
    stmt = select(Chapter).where(Chapter.story_id == story_id).order_by(Chapter.number)
    if limit is not None:
        stmt = stmt.offset(offset).limit(limit)
    rows = (await db.execute(stmt)).scalars().all()
    return envelope_ok({"chapters": [ChapterOut.model_validate(c).model_dump(mode="json") for c in rows]})


@router.put("/{story_id}/chapters/order")
async def reorder_chapters(story_id: str, payload: ChapterReorderRequest, user: CurrentUser, db: DB):
    """Renumber chapters to match the supplied id order (1..N)."""
    await get_user_story(story_id, user, db)
    rows = (
        await db.execute(select(Chapter).where(Chapter.story_id == story_id))
    ).scalars().all()
    by_id = {c.id: c for c in rows}
    if len(payload.chapter_ids) != len(set(payload.chapter_ids)):
        raise Conflict("Chapter order contains duplicates")
    if set(payload.chapter_ids) != set(by_id):
        raise Conflict("Chapter order must include every chapter of the story exactly once")

    # Two-pass renumber so the unique (story_id, number) index never collides
    # mid-update (e.g. swapping 2 and 3).
    for i, cid in enumerate(payload.chapter_ids, start=1):
        by_id[cid].number = -i
    await db.flush()
    for i, cid in enumerate(payload.chapter_ids, start=1):
        by_id[cid].number = i
    await db.commit()
    return envelope_ok({"order": payload.chapter_ids})


@router.get("/{story_id}/chapters/{chapter_id}/revisions")
async def list_chapter_revisions(story_id: str, chapter_id: str, user: CurrentUser, db: DB):
    await get_user_story(story_id, user, db)
    rows = await revision_service.list_for_chapter(db, story_id, chapter_id)
    return envelope_ok({
        "revisions": [ChapterRevisionOut.model_validate(r).model_dump(mode="json") for r in rows]
    })


@router.post("/{story_id}/chapters/{chapter_id}/revisions/{revision_id}/restore")
async def restore_chapter_revision(story_id: str, chapter_id: str, revision_id: str, user: CurrentUser, db: DB):
    await get_user_story(story_id, user, db)
    chapter = await revision_service.restore(db, story_id, chapter_id, revision_id)
    await db.commit()
    await db.refresh(chapter)
    return envelope_ok({"chapter": ChapterOut.model_validate(chapter).model_dump(mode="json")})


@router.post("/{story_id}/chapters")
async def create_chapter(story_id: str, payload: ChapterIn, user: CurrentUser, db: DB):
    await get_user_story(story_id, user, db)
    next_number = payload.number
    if next_number is None:
        max_num = await db.scalar(select(func.coalesce(func.max(Chapter.number), 0)).where(Chapter.story_id == story_id)) or 0
        next_number = int(max_num) + 1
    elif await _number_taken(db, story_id, next_number):
        raise Conflict(f"Chapter {next_number} already exists")
    data = payload.model_dump(exclude={"number"})
    chapter = Chapter(
        story_id=story_id,
        number=next_number,
        word_count=text_stats.count_words(payload.content),
        **data,
    )
    db.add(chapter)
    await text_stats.record_delta(db, story_id, chapter.word_count)
    await db.commit()
    await db.refresh(chapter)
    return envelope_ok({"chapter": ChapterOut.model_validate(chapter).model_dump(mode="json")})


@router.get("/{story_id}/chapters/{chapter_id}")
async def get_chapter(story_id: str, chapter_id: str, user: CurrentUser, db: DB):
    await get_user_story(story_id, user, db)
    chapter = await db.get(Chapter, chapter_id)
    if chapter is None or chapter.story_id != story_id:
        raise NotFound("Chapter not found")
    return envelope_ok({"chapter": ChapterOut.model_validate(chapter).model_dump(mode="json")})


@router.patch("/{story_id}/chapters/{chapter_id}")
async def patch_chapter(story_id: str, chapter_id: str, payload: ChapterPatch, user: CurrentUser, db: DB):
    await get_user_story(story_id, user, db)
    chapter = await db.get(Chapter, chapter_id)
    if chapter is None or chapter.story_id != story_id:
        raise NotFound("Chapter not found")

    fields = payload.model_dump(exclude_unset=True)
    if "number" in fields and fields["number"] is not None and fields["number"] != chapter.number:
        if await _number_taken(db, story_id, fields["number"], exclude_id=chapter.id):
            raise Conflict(f"Chapter {fields['number']} already exists")

    content_changed = "content" in fields and fields["content"] != chapter.content
    if content_changed or "title" in fields or "summary" in fields:
        await revision_service.capture(db, chapter, source="manual", note="manual edit")

    old_words = chapter.word_count or 0
    for field, value in fields.items():
        if value is None and field in {"number", "title", "content", "summary", "character_ids", "seeds"}:
            continue
        setattr(chapter, field, value)
    if "content" in fields:
        chapter.word_count = text_stats.count_words(chapter.content)
        await text_stats.record_delta(db, story_id, chapter.word_count - old_words)

    await db.commit()
    await db.refresh(chapter)
    return envelope_ok({"chapter": ChapterOut.model_validate(chapter).model_dump(mode="json")})


@router.delete("/{story_id}/chapters/{chapter_id}")
async def delete_chapter(story_id: str, chapter_id: str, user: CurrentUser, db: DB):
    await get_user_story(story_id, user, db)
    chapter = await db.get(Chapter, chapter_id)
    if chapter is None or chapter.story_id != story_id:
        raise NotFound("Chapter not found")
    await db.delete(chapter)
    # Leave the gap in chapter numbering so the writer can deliberately
    # fill it back in via Flow Writing (the Flow page detects gaps and
    # defaults to targeting the lowest one).
    await db.commit()
    return envelope_ok({"deleted": chapter_id})
