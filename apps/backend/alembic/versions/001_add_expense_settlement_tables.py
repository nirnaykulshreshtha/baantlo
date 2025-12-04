"""Add expense and settlement tables

Revision ID: 001
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create expenses table
    op.create_table('expenses',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('group_id', sa.String(), nullable=False),
        sa.Column('payer_id', sa.String(), nullable=False),
        sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('currency', sa.CHAR(length=3), nullable=False),
        sa.Column('amount_inr', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('expense_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('receipt_key', sa.String(), nullable=True),
        sa.Column('created_by', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['group_id'], ['groups.id'], ),
        sa.ForeignKeyConstraint(['payer_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('amount > 0', name='ck_expense_amount_positive'),
        sa.CheckConstraint('amount_inr > 0', name='ck_expense_amount_inr_positive')
    )
    op.create_index('idx_expenses_created_by', 'expenses', ['created_by'], unique=False)
    op.create_index('idx_expenses_expense_date', 'expenses', ['expense_date'], unique=False)
    op.create_index('idx_expenses_group_id', 'expenses', ['group_id'], unique=False)
    op.create_index('idx_expenses_payer_id', 'expenses', ['payer_id'], unique=False)

    # Create expense_splits table
    op.create_table('expense_splits',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('expense_id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('amount_inr', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('percentage', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['expense_id'], ['expenses.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('amount >= 0', name='ck_expense_split_amount_non_negative'),
        sa.CheckConstraint('amount_inr >= 0', name='ck_expense_split_amount_inr_non_negative'),
        sa.CheckConstraint('percentage IS NULL OR (percentage >= 0 AND percentage <= 100)', name='ck_expense_split_percentage_range')
    )
    op.create_index('idx_expense_splits_expense_id', 'expense_splits', ['expense_id'], unique=False)
    op.create_index('idx_expense_splits_user_id', 'expense_splits', ['user_id'], unique=False)

    # Create settlements table
    op.create_table('settlements',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('group_id', sa.String(), nullable=False),
        sa.Column('from_user_id', sa.String(), nullable=False),
        sa.Column('to_user_id', sa.String(), nullable=False),
        sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('amount_inr', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('currency', sa.CHAR(length=3), nullable=False),
        sa.Column('method', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('payment_id', sa.String(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('settled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['from_user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['group_id'], ['groups.id'], ),
        sa.ForeignKeyConstraint(['to_user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('amount > 0', name='ck_settlement_amount_positive'),
        sa.CheckConstraint('amount_inr > 0', name='ck_settlement_amount_inr_positive'),
        sa.CheckConstraint('from_user_id <> to_user_id', name='ck_settlement_different_users'),
        sa.CheckConstraint("method IN ('cash', 'upi', 'bank_transfer')", name='ck_settlement_method'),
        sa.CheckConstraint("status IN ('pending', 'completed', 'failed', 'cancelled')", name='ck_settlement_status')
    )
    op.create_index('idx_settlements_from_user_id', 'settlements', ['from_user_id'], unique=False)
    op.create_index('idx_settlements_group_id', 'settlements', ['group_id'], unique=False)
    op.create_index('idx_settlements_status', 'settlements', ['status'], unique=False)
    op.create_index('idx_settlements_to_user_id', 'settlements', ['to_user_id'], unique=False)


def downgrade() -> None:
    op.drop_index('idx_settlements_to_user_id', table_name='settlements')
    op.drop_index('idx_settlements_status', table_name='settlements')
    op.drop_index('idx_settlements_group_id', table_name='settlements')
    op.drop_index('idx_settlements_from_user_id', table_name='settlements')
    op.drop_table('settlements')
    op.drop_index('idx_expense_splits_user_id', table_name='expense_splits')
    op.drop_index('idx_expense_splits_expense_id', table_name='expense_splits')
    op.drop_table('expense_splits')
    op.drop_index('idx_expenses_payer_id', table_name='expenses')
    op.drop_index('idx_expenses_group_id', table_name='expenses')
    op.drop_index('idx_expenses_expense_date', table_name='expenses')
    op.drop_index('idx_expenses_created_by', table_name='expenses')
    op.drop_table('expenses')
