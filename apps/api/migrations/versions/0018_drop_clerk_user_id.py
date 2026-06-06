"""Drop users.clerk_user_id (Clerk auth removed)

Clerk was removed in favor of the built-in email+password JWT auth, so the
`clerk_user_id` link column (added in 0011) is no longer used. Drop it and its
unique index. Uses batch mode so the column drop also works on SQLite, whose
older versions cannot ALTER TABLE DROP COLUMN directly.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0018"
down_revision = "0017"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the index first so batch-mode table recreation (SQLite) doesn't try to
    # re-create it on the rebuilt table.
    op.drop_index("ix_users_clerk_user_id", table_name="users")
    with op.batch_alter_table("users") as batch:
        batch.drop_column("clerk_user_id")


def downgrade() -> None:
    with op.batch_alter_table("users") as batch:
        batch.add_column(sa.Column("clerk_user_id", sa.String(64), nullable=True))
    op.create_index("ix_users_clerk_user_id", "users", ["clerk_user_id"], unique=True)
