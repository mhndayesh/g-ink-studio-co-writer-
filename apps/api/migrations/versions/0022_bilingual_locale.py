"""Add per-user UI locale and per-story language.

Revision ID: 0022
Revises: 0021
Create Date: 2026-11-10
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0022"
down_revision = "0021"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("locale", sa.String(length=5), server_default="en", nullable=False),
    )
    op.add_column(
        "stories",
        sa.Column("language", sa.String(length=5), server_default="en", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("stories", "language")
    op.drop_column("users", "locale")
