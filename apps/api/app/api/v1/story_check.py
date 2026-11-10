from fastapi import APIRouter
from sqlalchemy import select

from app.core.deps import CurrentUser, DB, get_user_story
from app.core.errors import NotFound, envelope_ok
from app.db.models import ContinuityReport
from app.db.schemas import StoryCheckRequest
from app.services import story_check_service

router = APIRouter()


@router.post("/{story_id}/check")
async def run_check(story_id: str, payload: StoryCheckRequest, user: CurrentUser, db: DB):
    await get_user_story(story_id, user, db)
    report = await story_check_service.check(db, user, story_id, payload.chapter_id, payload.pass_type)
    await db.commit()
    return envelope_ok(report.model_dump())


@router.get("/{story_id}/check/reports")
async def list_reports(story_id: str, user: CurrentUser, db: DB, limit: int = 20):
    await get_user_story(story_id, user, db)
    rows = (
        await db.execute(
            select(ContinuityReport)
            .where(ContinuityReport.story_id == story_id)
            .order_by(ContinuityReport.created_at.desc())
            .limit(min(max(limit, 1), 100))
        )
    ).scalars().all()
    return envelope_ok({
        "reports": [
            {
                "id": r.id,
                "chapter_id": r.chapter_id,
                "severity_buckets": r.severity_buckets,
                "findings": r.findings,
                "strengths": r.strengths,
                "created_at": r.created_at.isoformat(),
            }
            for r in rows
        ]
    })


@router.get("/{story_id}/check/reports/{report_id}")
async def get_report(story_id: str, report_id: str, user: CurrentUser, db: DB):
    await get_user_story(story_id, user, db)
    row = await db.get(ContinuityReport, report_id)
    if row is None or row.story_id != story_id:
        raise NotFound("Report not found")
    return envelope_ok({
        "id": row.id,
        "chapter_id": row.chapter_id,
        "severity_buckets": row.severity_buckets,
        "findings": row.findings,
        "strengths": row.strengths,
        "created_at": row.created_at.isoformat(),
    })
