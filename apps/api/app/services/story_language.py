"""Resolve the language a story is written in.

Kept separate from the UI locale: an author may browse the interface in English
while writing an Arabic novel. Every AI task for a story uses this language.
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.i18n import Locale, normalize_locale
from app.db.models import Story


async def get_story_language(db: AsyncSession, story_id: str | None) -> Locale:
    if not story_id:
        return "en"
    value = await db.scalar(select(Story.language).where(Story.id == story_id))
    return normalize_locale(value)
