"""Post-approve derived work, off the request path.

Approving a chapter used to serialize three whole-manuscript passes into the
writer's response: a story snapshot, a voice-fingerprint rebuild, and a Neo4j
reprojection (vectors were never refreshed at all). The snapshot stays in the
request because its version number is returned, but runs on its own session
after the write transaction commits. Everything else runs here:

  * voice fingerprints
  * Qdrant vector re-index
  * Neo4j graph reprojection

With Redis, this is an ARQ job (deduped per story). Without Redis it runs as a
detached asyncio task with its own sessions.
"""
from __future__ import annotations

import asyncio
import logging

from app.core.config import get_settings
from app.db.session import SessionLocal

log = logging.getLogger("gink.post_approve")

_tasks: set[asyncio.Task] = set()


async def run(story_id: str, chapter_id: str | None = None) -> dict:
    result: dict = {"story_id": story_id}
    from app.db.models import Story, User

    async with SessionLocal() as db:
        story = await db.get(Story, story_id)
        if story is None:
            return {**result, "reason": "story_gone"}

        # 1. Voice fingerprints (deterministic, cheap-ish, derived).
        try:
            from app.services import voice_service

            await voice_service.rebuild_profiles(db, story_id)
            await db.commit()
            result["voice"] = "ok"
        except Exception as e:
            await db.rollback()
            log.debug("voice rebuild failed: %s", e)
            result["voice"] = f"failed:{e}"

        # 2. Vector index — incremental (this chapter + its scenes) so Graph-RAG
        # is current right after an approve without re-embedding the manuscript.
        try:
            user = await db.get(User, story.user_id)
            if user is not None:
                from app.services import embedding_service

                if chapter_id:
                    idx = await embedding_service.index_chapter(db, user, story_id, chapter_id)
                else:
                    idx = await embedding_service.index_story(db, user, story_id)
                result["vectors"] = idx
        except Exception as e:
            await db.rollback()
            log.debug("vector reindex failed: %s", e)
            result["vectors"] = f"failed:{e}"

        # 3. Neo4j projection.
        try:
            from app.services import graph_service

            result["graph"] = await graph_service.reproject_story(db, story_id)
            await db.commit()
        except Exception as e:
            await db.rollback()
            log.debug("graph reproject failed: %s", e)
            result["graph"] = f"failed:{e}"

    return result


async def schedule(story_id: str, chapter_id: str | None = None) -> None:
    """Queue post-approve work; never raises into the approve response."""
    settings = get_settings()
    if settings.redis_url:
        try:
            from app.workers.pool import get_pool

            pool = await get_pool()
            await pool.enqueue_job(
                "post_approve_task",
                story_id,
                chapter_id,
                _job_id=f"post_approve:{story_id}",
            )
            return
        except Exception as e:
            log.debug("post_approve enqueue failed (%s); running in-process", e)

    task = asyncio.create_task(run(story_id, chapter_id))
    _tasks.add(task)
    task.add_done_callback(_tasks.discard)
