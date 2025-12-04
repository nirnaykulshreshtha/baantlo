"""Add group_type field to groups

Revision ID: 003
Revises: 002
Create Date: 2024-12-19 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum type for group_type
    group_type_enum = sa.Enum(
        'trip', 'home', 'couple', 'personal', 'business', 'event', 'other',
        name='grouptype'
    )
    group_type_enum.create(op.get_bind())
    
    # Add group_type column with default value 'other'
    op.add_column('groups', sa.Column('group_type', group_type_enum, nullable=False, server_default='other'))


def downgrade() -> None:
    # Drop the group_type column
    op.drop_column('groups', 'group_type')
    
    # Drop the enum type
    op.execute('DROP TYPE grouptype')
