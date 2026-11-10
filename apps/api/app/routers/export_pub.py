from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from starlette.concurrency import run_in_threadpool

from app.core.deps import get_current_user, get_db
from app.db.models import User, Story, Chapter
from app.db.session import get_redis
from app.services.publishing_export_service import (
    export_pdf, export_epub, export_docx, export_submission_package,
)
from app.services import storage_service
from app.core.errors import NotFound, Forbidden

export_router = APIRouter()


async def _load_story_chapters(story_id: str, user: User, db: AsyncSession):
    story = await db.get(Story, story_id)
    if not story:
        raise NotFound("story")
    if story.user_id != user.id:
        raise Forbidden("not your story")
    chapters = (await db.execute(
        select(Chapter)
        .where(Chapter.story_id == story_id)
        .order_by(Chapter.number)
    )).scalars().all()
    ch_list = [
        {"number": c.number, "title": c.title or f"Chapter {c.number}", "content": c.content or ""}
        for c in chapters if c.content
    ]
    return story, ch_list


def _author_name(user: User) -> str:
    return user.display_name or user.email.split("@")[0]


async def _cached(story_id: str, fmt: str) -> bytes | None:
    """Serve the async worker's rendered bytes instead of re-rendering."""
    redis = get_redis()
    if redis is None:
        return None
    try:
        data = await redis.get(f"export:{story_id}:{fmt}")
        return bytes(data) if data else None
    except Exception:
        return None


@export_router.get("/{story_id}/pdf")
async def get_pdf(
    story_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    story, chs = await _load_story_chapters(story_id, user, db)
    cached = await _cached(story_id, "pdf")
    if cached is not None:
        fname = f"{story.title or 'story'}.pdf"
        return Response(content=cached, media_type="application/pdf",
                        headers={"Content-Disposition": f'attachment; filename="{fname}"'})
    cover = storage_service.read_cover(story.cover_image_url)
    data, fname, mime = await run_in_threadpool(
        export_pdf, story.title, _author_name(user), None, chs, cover_bytes=cover
    )
    return Response(content=data, media_type=mime,
                    headers={"Content-Disposition": f'attachment; filename="{fname}"'})


@export_router.get("/{story_id}/epub")
async def get_epub(
    story_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    story, chs = await _load_story_chapters(story_id, user, db)
    cached = await _cached(story_id, "epub")
    if cached is not None:
        fname = f"{story.title or 'story'}.epub"
        return Response(content=cached, media_type="application/epub+zip",
                        headers={"Content-Disposition": f'attachment; filename="{fname}"'})
    cover = storage_service.read_cover(story.cover_image_url)
    data, fname, mime = await run_in_threadpool(
        export_epub, story.title, _author_name(user), None,
        story.genre if story.genre else None, chs, cover_bytes=cover,
    )
    return Response(content=data, media_type=mime,
                    headers={"Content-Disposition": f'attachment; filename="{fname}"'})


@export_router.get("/{story_id}/docx")
async def get_docx(
    story_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    story, chs = await _load_story_chapters(story_id, user, db)
    data, fname, mime = await run_in_threadpool(
        export_docx, story.title, _author_name(user), chs
    )
    return Response(content=data, media_type=mime,
                    headers={"Content-Disposition": f'attachment; filename="{fname}"'})


@export_router.get("/{story_id}/package")
async def get_package(
    story_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    story, chs = await _load_story_chapters(story_id, user, db)
    data, fname, mime = await export_submission_package(
        story.title, _author_name(user), None,
        story.genre if story.genre else None, chs,
    )
    return Response(content=data, media_type=mime,
                    headers={"Content-Disposition": f'attachment; filename="{fname}"'})
