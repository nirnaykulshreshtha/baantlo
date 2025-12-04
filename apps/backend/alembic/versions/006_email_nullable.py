"""Make user email nullable for phone-first accounts

Revision ID: 006_email_nullable
Revises: 005_convert_ids_to_uuid
Create Date: 2025-02-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "006_email_nullable"
down_revision = "005_convert_ids_to_uuid"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Allow email to be optional so phone-only users can exist."""
    op.alter_column(
        "users",
        "email",
        existing_type=sa.String(),
        nullable=True,
    )


def downgrade() -> None:
    """Revert email to NOT NULL to match previous schema."""
    op.alter_column(
        "users",
        "email",
        existing_type=sa.String(),
        nullable=False,
    )
