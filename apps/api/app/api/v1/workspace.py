from fastapi import APIRouter
from sqlalchemy import select

from app.core.deps import CurrentUser, DB, get_user_story
from app.core.errors import NotFound, envelope_ok
from app.db.models import StoryNote
from app.db.schemas import StoryNoteIn, StoryNoteOut

router = APIRouter()


@router.get("/{story_id}/notes")
async def list_notes(story_id: str, user: CurrentUser, db: DB):
    await get_user_story(story_id, user, db)
    rows = (
        await db.execute(
            select(StoryNote).where(StoryNote.story_id == story_id).order_by(StoryNote.updated_at.desc())
        )
    ).scalars().all()
    return envelope_ok({"notes": [StoryNoteOut.model_validate(n).model_dump(mode="json") for n in rows]})


@router.post("/{story_id}/notes")
async def create_note(story_id: str, payload: StoryNoteIn, user: CurrentUser, db: DB):
    await get_user_story(story_id, user, db)
    row = StoryNote(story_id=story_id, title=payload.title[:255], body=payload.body)
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return envelope_ok({"note": StoryNoteOut.model_validate(row).model_dump(mode="json")})


@router.patch("/{story_id}/notes/{note_id}")
async def patch_note(story_id: str, note_id: str, payload: StoryNoteIn, user: CurrentUser, db: DB):
    await get_user_story(story_id, user, db)
    row = await db.get(StoryNote, note_id)
    if row is None or row.story_id != story_id:
        raise NotFound("Note not found")
    row.title = payload.title[:255]
    row.body = payload.body
    await db.commit()
    await db.refresh(row)
    return envelope_ok({"note": StoryNoteOut.model_validate(row).model_dump(mode="json")})


@router.delete("/{story_id}/notes/{note_id}")
async def delete_note(story_id: str, note_id: str, user: CurrentUser, db: DB):
    await get_user_story(story_id, user, db)
    row = await db.get(StoryNote, note_id)
    if row is None or row.story_id != story_id:
        raise NotFound("Note not found")
    await db.delete(row)
    await db.commit()
    return envelope_ok({"deleted": note_id})
