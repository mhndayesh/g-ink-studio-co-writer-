"""Authoring lifecycle: revisions, real word counts, goals, notes, search,
flow draft workflow state, and idempotency payload hashes.

Revision ID: 0023
Revises: 0022
Create Date: 2026-11-12
"""
from __future__ import annotations

import re

import sqlalchemy as sa
from alembic import op

revision = "0023"
down_revision = "0022"
branch_labels = None
depends_on = None


_WORD_RE = re.compile(r"\b[\w'-]+\b", re.UNICODE)


def _word_count(text: str) -> int:
    return len(_WORD_RE.findall(text or ""))


def upgrade() -> None:
    bind = op.get_bind()

    # ── stories: writing goals ────────────────────────────────────────────
    op.add_column("stories", sa.Column("target_word_count", sa.Integer(), nullable=True))
    op.add_column("stories", sa.Column("daily_word_target", sa.Integer(), nullable=True))
    op.add_column("stories", sa.Column("deadline", sa.DateTime(timezone=True), nullable=True))

    # ── chapters: real word count (backfilled below) ──────────────────────
    op.add_column(
        "chapters",
        sa.Column("word_count", sa.Integer(), server_default="0", nullable=False),
    )

    # ── flow_drafts: full workflow state ──────────────────────────────────
    op.add_column("flow_drafts", sa.Column("phase", sa.String(length=32), server_default="writing", nullable=False))
    op.add_column("flow_drafts", sa.Column("target", sa.String(length=64), server_default="new", nullable=False))
    op.add_column("flow_drafts", sa.Column("chapter_title", sa.String(length=255), server_default="", nullable=False))
    op.add_column("flow_drafts", sa.Column("chapter_summary", sa.Text(), server_default="", nullable=False))
    op.add_column("flow_drafts", sa.Column("scene_character_ids", sa.JSON(), nullable=True))
    op.add_column("flow_drafts", sa.Column("scene_location_id", sa.String(length=32), nullable=True))
    op.add_column("flow_drafts", sa.Column("enhancer_on", sa.Boolean(), server_default=sa.text("false"), nullable=False))

    # ── idempotency: payload hash ─────────────────────────────────────────
    op.add_column(
        "idempotency_keys",
        sa.Column("request_hash", sa.String(length=64), server_default="", nullable=False),
    )

    # ── new tables ────────────────────────────────────────────────────────
    op.create_table(
        "chapter_revisions",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("story_id", sa.String(length=32), sa.ForeignKey("stories.id", ondelete="CASCADE"), nullable=False),
        sa.Column("chapter_id", sa.String(length=32), sa.ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(length=255), server_default="", nullable=False),
        sa.Column("content", sa.Text(), server_default="", nullable=False),
        sa.Column("summary", sa.Text(), server_default="", nullable=False),
        sa.Column("word_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("source", sa.String(length=24), server_default="manual", nullable=False),
        sa.Column("note", sa.String(length=255), server_default="", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_chapter_revisions_story", "chapter_revisions", ["story_id"])
    op.create_index("ix_chapter_revisions_chapter", "chapter_revisions", ["chapter_id"])
    op.create_index("ix_chapter_revisions_chapter_created", "chapter_revisions", ["chapter_id", "created_at"])

    op.create_table(
        "story_notes",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("story_id", sa.String(length=32), sa.ForeignKey("stories.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(length=255), server_default="", nullable=False),
        sa.Column("body", sa.Text(), server_default="", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_story_notes_story", "story_notes", ["story_id"])

    op.create_table(
        "writing_days",
        sa.Column("story_id", sa.String(length=32), sa.ForeignKey("stories.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("day", sa.String(length=10), primary_key=True),
        sa.Column("words", sa.Integer(), server_default="0", nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # ── backfill real word counts ─────────────────────────────────────────
    rows = bind.execute(sa.text("SELECT id, content FROM chapters")).fetchall()
    for chapter_id, content in rows:
        bind.execute(
            sa.text("UPDATE chapters SET word_count = :wc WHERE id = :id"),
            {"wc": _word_count(content), "id": chapter_id},
        )

    # ── de-duplicate chapter numbers, then enforce uniqueness ────────────
    rows = bind.execute(
        sa.text("SELECT id, story_id, number FROM chapters ORDER BY story_id, number, created_at")
    ).fetchall()
    seen: dict[str, set[int]] = {}
    for chapter_id, story_id, number in rows:
        used = seen.setdefault(story_id, set())
        candidate = int(number or 1)
        if candidate in used:
            candidate = max(used) + 1
            bind.execute(
                sa.text("UPDATE chapters SET number = :n WHERE id = :id"),
                {"n": candidate, "id": chapter_id},
            )
        used.add(candidate)
    op.create_index("uq_chapters_story_number", "chapters", ["story_id", "number"], unique=True)

    # ── supporting indexes ────────────────────────────────────────────────
    op.create_index("ix_reviews_publication_status", "reviews", ["publication_id", "status"])
    op.create_index("ix_publications_status_published", "publications", ["status", "published_at"])
    op.create_index("ix_scene_cards_story_sort", "scene_cards", ["story_id", "time_sort_key"])


def downgrade() -> None:
    op.drop_index("ix_scene_cards_story_sort", table_name="scene_cards")
    op.drop_index("ix_publications_status_published", table_name="publications")
    op.drop_index("ix_reviews_publication_status", table_name="reviews")
    op.drop_index("uq_chapters_story_number", table_name="chapters")

    op.drop_table("writing_days")
    op.drop_index("ix_story_notes_story", table_name="story_notes")
    op.drop_table("story_notes")
    op.drop_index("ix_chapter_revisions_chapter_created", table_name="chapter_revisions")
    op.drop_index("ix_chapter_revisions_chapter", table_name="chapter_revisions")
    op.drop_index("ix_chapter_revisions_story", table_name="chapter_revisions")
    op.drop_table("chapter_revisions")

    op.drop_column("idempotency_keys", "request_hash")
    op.drop_column("flow_drafts", "enhancer_on")
    op.drop_column("flow_drafts", "scene_location_id")
    op.drop_column("flow_drafts", "scene_character_ids")
    op.drop_column("flow_drafts", "chapter_summary")
    op.drop_column("flow_drafts", "chapter_title")
    op.drop_column("flow_drafts", "target")
    op.drop_column("flow_drafts", "phase")
    op.drop_column("chapters", "word_count")
    op.drop_column("stories", "deadline")
    op.drop_column("stories", "daily_word_target")
    op.drop_column("stories", "target_word_count")
