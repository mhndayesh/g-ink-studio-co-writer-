from fastapi import APIRouter, Query
from sqlalchemy import func, or_, select

from app.core.deps import CurrentUser, DB, get_user_story
from app.core.errors import envelope_ok
from app.db.models import (
    Chapter,
    Character,
    Faction,
    Location,
    PlotThread,
    SceneCard,
    Story,
    StoryNote,
    World,
)
from app.db.schemas import SearchHit, SearchResponse, StoryCreate, StoryOut, StoryStats, StoryUpdate
from app.services import text_stats

router = APIRouter()


async def _story_out(db, story: Story) -> dict:
    chapter_count = await db.scalar(select(func.count()).where(Chapter.story_id == story.id)) or 0
    character_count = await db.scalar(select(func.count()).where(Character.story_id == story.id)) or 0
    words = await db.scalar(
        select(func.coalesce(func.sum(Chapter.word_count), 0)).where(Chapter.story_id == story.id)
    ) or 0
    daily = await text_stats.daily_stats(db, story.id, days=30)
    return {
        **StoryOut.model_validate(story).model_dump(mode="json"),
        "stats": StoryStats(
            words=int(words),
            chapters=int(chapter_count),
            characters=int(character_count),
            words_today=daily["words_today"],
            streak_days=daily["streak_days"],
            target_word_count=story.target_word_count,
            daily_word_target=story.daily_word_target,
            deadline=story.deadline,
        ).model_dump(mode="json"),
    }


@router.get("")
async def list_stories(
    user: CurrentUser,
    db: DB,
    limit: int | None = Query(None, ge=1, le=200, description="Opt-in page size; omit to return all."),
    offset: int = Query(0, ge=0),
):
    stmt = select(Story).where(Story.user_id == user.id).order_by(Story.updated_at.desc())
    if limit is not None:
        stmt = stmt.offset(offset).limit(limit)
    rows = (await db.execute(stmt)).scalars().all()
    out = [await _story_out(db, s) for s in rows]
    return envelope_ok({"stories": out})


@router.post("")
async def create_story(payload: StoryCreate, user: CurrentUser, db: DB):
    story = Story(
        user_id=user.id,
        title=payload.title or "Untitled",
        genre=payload.genre,
        language=payload.language,
        palette_idx=payload.palette_idx,
    )
    db.add(story)
    await db.flush()
    db.add(World(story_id=story.id, title=story.title, genre=story.genre))
    await db.commit()
    await db.refresh(story)
    return envelope_ok({"story": await _story_out(db, story)})


@router.get("/{story_id}")
async def get_story(story_id: str, user: CurrentUser, db: DB):
    story = await get_user_story(story_id, user, db)
    return envelope_ok({"story": await _story_out(db, story)})


@router.patch("/{story_id}")
async def update_story(story_id: str, payload: StoryUpdate, user: CurrentUser, db: DB):
    story = await get_user_story(story_id, user, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "language" and value is None:
            continue
        setattr(story, field, value)
    await db.commit()
    await db.refresh(story)
    return envelope_ok({"story": await _story_out(db, story)})


@router.delete("/{story_id}")
async def delete_story(story_id: str, user: CurrentUser, db: DB):
    story = await get_user_story(story_id, user, db)
    await db.delete(story)
    await db.commit()
    return envelope_ok({"deleted": story_id})


@router.get("/{story_id}/stats")
async def story_stats(story_id: str, user: CurrentUser, db: DB, days: int = Query(30, ge=1, le=365)):
    story = await get_user_story(story_id, user, db)
    daily = await text_stats.daily_stats(db, story.id, days=days)
    words = await db.scalar(
        select(func.coalesce(func.sum(Chapter.word_count), 0)).where(Chapter.story_id == story.id)
    ) or 0
    return envelope_ok({
        "words": int(words),
        "target_word_count": story.target_word_count,
        "daily_word_target": story.daily_word_target,
        "deadline": story.deadline.isoformat() if story.deadline else None,
        **daily,
    })


@router.get("/{story_id}/search")
async def search_story(
    story_id: str,
    user: CurrentUser,
    db: DB,
    q: str = Query(min_length=1, max_length=200),
    limit: int = Query(30, ge=1, le=100),
):
    """Portable substring search across the manuscript and story bible."""
    await get_user_story(story_id, user, db)
    like = f"%{q}%"
    hits: list[SearchHit] = []

    chapters = (await db.execute(
        select(Chapter)
        .where(Chapter.story_id == story_id, or_(
            Chapter.title.ilike(like), Chapter.content.ilike(like), Chapter.summary.ilike(like),
        ))
        .order_by(Chapter.number)
        .limit(limit)
    )).scalars().all()
    for c in chapters:
        idx = (c.content or "").lower().find(q.lower())
        snippet = (c.content or "")[max(0, idx - 60): idx + 140] if idx >= 0 else (c.summary or "")
        hits.append(SearchHit(
            kind="chapter", id=c.id, title=f"Ch{c.number}. {c.title or 'Untitled'}",
            snippet=snippet.strip(), meta={"number": c.number},
        ))

    async def _named(model, kind: str, title_field: str, body_field: str):
        rows = (await db.execute(
            select(model)
            .where(model.story_id == story_id, or_(
                getattr(model, title_field).ilike(like), getattr(model, body_field).ilike(like),
            ))
            .limit(limit)
        )).scalars().all()
        for row in rows:
            hits.append(SearchHit(
                kind=kind, id=row.id,
                title=getattr(row, title_field) or kind.title(),
                snippet=(getattr(row, body_field) or "")[:180],
                meta={},
            ))

    await _named(Character, "character", "name", "personality")
    await _named(Location, "location", "name", "description")
    await _named(Faction, "faction", "name", "description")
    await _named(PlotThread, "thread", "name", "description")
    await _named(SceneCard, "scene", "title", "summary")
    await _named(StoryNote, "note", "title", "body")

    return envelope_ok(SearchResponse(query=q, hits=hits[:limit]).model_dump())
