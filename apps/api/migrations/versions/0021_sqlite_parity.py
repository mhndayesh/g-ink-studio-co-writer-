"""Bring SQLite dev schema to parity with the Postgres constraints added in 0019.

Revision ID: 0021
Revises: 0020
Create Date: 2026-11-10
"""
from __future__ import annotations

from alembic import op

revision = "0021"
down_revision = "0020"
branch_labels = None
depends_on = None

_RATING_CHECKS = [
    ("ck_story_rating_overall", "overall BETWEEN 1 AND 5"),
    ("ck_story_rating_score_story", "score_story IS NULL OR score_story BETWEEN 1 AND 5"),
    ("ck_story_rating_score_craft", "score_craft IS NULL OR score_craft BETWEEN 1 AND 5"),
    ("ck_story_rating_score_characters", "score_characters IS NULL OR score_characters BETWEEN 1 AND 5"),
    ("ck_story_rating_score_pacing", "score_pacing IS NULL OR score_pacing BETWEEN 1 AND 5"),
    ("ck_story_rating_score_world", "score_world IS NULL OR score_world BETWEEN 1 AND 5"),
]


def upgrade() -> None:
    bind = op.get_bind()
    is_sqlite = bind.dialect.name == "sqlite"

    if is_sqlite:
        with op.batch_alter_table("story_ratings", recreate="always") as batch:
            for name, expression in _RATING_CHECKS:
                batch.create_check_constraint(name, expression)

    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_lower "
        "ON users (lower(email))"
    )


def downgrade() -> None:
    bind = op.get_bind()
    is_sqlite = bind.dialect.name == "sqlite"

    if is_sqlite:
        op.execute("DROP INDEX IF EXISTS uq_users_email_lower")
        with op.batch_alter_table("story_ratings", recreate="always") as batch:
            for name, _expression in _RATING_CHECKS:
                batch.drop_constraint(name, type_="check")
