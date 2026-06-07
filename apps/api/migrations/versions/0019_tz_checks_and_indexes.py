"""Publishing timestamps → timestamptz, rating range CHECKs, case-insensitive
email uniqueness, and missing hot-path indexes.

Review remediation:
- Publishing tables stored timestamps as naive `timestamp` (utcnow()), unlike the
  core tables' `timestamptz`, so cross-table datetime comparisons were unsafe.
  Convert them to `timestamptz` (interpreting existing values as UTC).
- Ratings (overall + score_*) were only range-validated in Pydantic; add DB CHECKs
  so non-route writers can't store 0/99.
- `users.email` had a plain unique index, so case variants created duplicate
  accounts. Add a unique index on lower(email) (the app now also normalizes).
- Add indexes for queries that previously table-scanned: publications.published_at
  (discovery feed), subscriptions.status / external_customer_id (billing sweeps +
  refund resolution), story_ratings.reader_id, reviews.reader_id.

Postgres-specific statements (ALTER TYPE, functional index, named CHECKs) are
guarded by dialect; on SQLite only the plain indexes are created (SQLite stores
naive datetimes and the dev/test path doesn't need the rest).

Revision ID: 0019
Revises: 0018
Create Date: 2026-06-07
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0019"
down_revision = "0018"
branch_labels = None
depends_on = None


# (table, column) for every publishing timestamp that was naive.
_TZ_COLUMNS = [
    ("publications", "published_at"),
    ("publications", "last_chapter_pushed_at"),
    ("publications", "created_at"),
    ("publications", "updated_at"),
    ("publication_chapters", "pushed_at"),
    ("reader_profiles", "created_at"),
    ("reading_progress", "started_at"),
    ("reading_progress", "last_read_at"),
    ("reading_progress", "completed_at"),
    ("story_ratings", "created_at"),
    ("story_ratings", "updated_at"),
    ("reviews", "approved_at"),
    ("reviews", "created_at"),
    ("private_notes", "replied_at"),
    ("private_notes", "created_at"),
    ("publication_follows", "followed_at"),
    ("notifications", "created_at"),
]

_RATING_CHECKS = [
    ("ck_story_rating_overall", "overall BETWEEN 1 AND 5"),
    ("ck_story_rating_score_story", "score_story IS NULL OR score_story BETWEEN 1 AND 5"),
    ("ck_story_rating_score_craft", "score_craft IS NULL OR score_craft BETWEEN 1 AND 5"),
    ("ck_story_rating_score_characters", "score_characters IS NULL OR score_characters BETWEEN 1 AND 5"),
    ("ck_story_rating_score_pacing", "score_pacing IS NULL OR score_pacing BETWEEN 1 AND 5"),
    ("ck_story_rating_score_world", "score_world IS NULL OR score_world BETWEEN 1 AND 5"),
]

# (index_name, table, column) — plain indexes, created on BOTH dialects.
_INDEXES = [
    ("ix_publications_published_at", "publications", "published_at"),
    ("ix_subscriptions_status", "subscriptions", "status"),
    ("ix_subscriptions_external_customer_id", "subscriptions", "external_customer_id"),
    ("ix_story_ratings_reader_id", "story_ratings", "reader_id"),
    ("ix_reviews_reader_id", "reviews", "reader_id"),
]


def upgrade() -> None:
    conn = op.get_bind()
    is_pg = conn.dialect.name == "postgresql"

    if is_pg:
        for table, col in _TZ_COLUMNS:
            op.alter_column(
                table, col,
                type_=sa.DateTime(timezone=True),
                postgresql_using=f"{col} AT TIME ZONE 'UTC'",
            )
        for name, expr in _RATING_CHECKS:
            op.create_check_constraint(name, "story_ratings", expr)
        # Case-insensitive unique email. (Existing duplicates, if any, must be
        # de-duped first; a fresh deploy has none.)
        op.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_lower ON users (lower(email))")

    for name, table, col in _INDEXES:
        op.create_index(name, table, [col])


def downgrade() -> None:
    conn = op.get_bind()
    is_pg = conn.dialect.name == "postgresql"

    for name, table, _col in _INDEXES:
        op.drop_index(name, table_name=table)

    if is_pg:
        op.execute("DROP INDEX IF EXISTS uq_users_email_lower")
        for name, _expr in _RATING_CHECKS:
            op.drop_constraint(name, "story_ratings", type_="check")
        for table, col in _TZ_COLUMNS:
            op.alter_column(
                table, col,
                type_=sa.DateTime(timezone=False),
                postgresql_using=f"{col} AT TIME ZONE 'UTC'",
            )
