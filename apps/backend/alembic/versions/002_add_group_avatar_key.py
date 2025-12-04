"""Add avatar_key to groups

Revision ID: 002
Revises: 001
Create Date: 2025-10-04 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('groups', sa.Column('avatar_key', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('groups', 'avatar_key')


