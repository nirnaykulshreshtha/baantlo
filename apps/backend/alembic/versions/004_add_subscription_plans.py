"""Add subscription plans and features tables

Revision ID: 004_add_subscription_plans
Revises: 003_add_group_type_field
Create Date: 2025-01-27 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '004_add_subscription_plans'
down_revision = '003_add_group_type_field'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Create subscription_plans and subscription_features tables.
    
    This migration adds support for dynamic subscription plan management
    where platform admins can create and manage pricing plans through
    the admin interface instead of hardcoded plans in the frontend.
    """
    # Create subscription_plans table
    op.create_table('subscription_plans',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False),
        sa.Column('price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False),
        sa.Column('billing_period', sa.String(length=20), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_popular', sa.Boolean(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('display_order', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create unique index on slug
    op.create_index(op.f('ix_subscription_plans_slug'), 'subscription_plans', ['slug'], unique=True)
    
    # Create subscription_features table
    op.create_table('subscription_features',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('plan_id', sa.Integer(), nullable=False),
        sa.Column('feature_text', sa.String(length=255), nullable=False),
        sa.Column('feature_type', sa.String(length=20), nullable=False),
        sa.Column('display_order', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['plan_id'], ['subscription_plans.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create index on plan_id for better query performance
    op.create_index(op.f('ix_subscription_features_plan_id'), 'subscription_features', ['plan_id'], unique=False)
    
    # Seed initial subscription plans data
    # Flatmates Plan (Free)
    op.execute("""
        INSERT INTO subscription_plans (name, slug, price, currency, billing_period, description, is_popular, is_active, display_order)
        VALUES ('Flatmates', 'flatmates', 0.00, 'INR', 'forever', 'Perfect for splitting PG rent, electricity bills, and groceries', false, true, 1);
    """)
    
    # Get the plan ID for features
    flatmates_plan_id = op.get_bind().execute(sa.text("SELECT id FROM subscription_plans WHERE slug = 'flatmates'")).scalar()
    
    # Add features for Flatmates plan
    op.execute(f"""
        INSERT INTO subscription_features (plan_id, feature_text, feature_type, display_order)
        VALUES 
            ({flatmates_plan_id}, 'Up to 3 groups', 'limit', 1),
            ({flatmates_plan_id}, 'Up to 50 expenses per month', 'limit', 2),
            ({flatmates_plan_id}, 'Up to 10 members per group', 'limit', 3),
            ({flatmates_plan_id}, 'Basic expense splitting', 'capability', 4),
            ({flatmates_plan_id}, 'Mobile app access', 'capability', 5),
            ({flatmates_plan_id}, 'Email notifications', 'capability', 6);
    """)
    
    # Friends & Trips Plan (Popular)
    op.execute("""
        INSERT INTO subscription_plans (name, slug, price, currency, billing_period, description, is_popular, is_active, display_order)
        VALUES ('Friends & Trips', 'friends-trips', 299.00, 'INR', 'month', 'Ideal for friend groups and travel expenses', true, true, 2);
    """)
    
    # Get the plan ID for features
    friends_plan_id = op.get_bind().execute(sa.text("SELECT id FROM subscription_plans WHERE slug = 'friends-trips'")).scalar()
    
    # Add features for Friends & Trips plan
    op.execute(f"""
        INSERT INTO subscription_features (plan_id, feature_text, feature_type, display_order)
        VALUES 
            ({friends_plan_id}, 'Up to 15 groups', 'limit', 1),
            ({friends_plan_id}, 'Up to 500 expenses per month', 'limit', 2),
            ({friends_plan_id}, 'Up to 30 members per group', 'limit', 3),
            ({friends_plan_id}, 'Photo bill scanning', 'capability', 4),
            ({friends_plan_id}, 'Multi-currency support', 'capability', 5),
            ({friends_plan_id}, 'Trip planning tools', 'capability', 6),
            ({friends_plan_id}, 'WhatsApp notifications', 'capability', 7),
            ({friends_plan_id}, 'Export to PDF', 'capability', 8),
            ({friends_plan_id}, 'Advanced split options', 'capability', 9);
    """)
    
    # Large Groups Plan (Enterprise)
    op.execute("""
        INSERT INTO subscription_plans (name, slug, price, currency, billing_period, description, is_popular, is_active, display_order)
        VALUES ('Large Groups', 'large-groups', 799.00, 'INR', 'month', 'For big families, events, and organizations', false, true, 3);
    """)
    
    # Get the plan ID for features
    large_plan_id = op.get_bind().execute(sa.text("SELECT id FROM subscription_plans WHERE slug = 'large-groups'")).scalar()
    
    # Add features for Large Groups plan
    op.execute(f"""
        INSERT INTO subscription_features (plan_id, feature_text, feature_type, display_order)
        VALUES 
            ({large_plan_id}, 'Unlimited groups', 'limit', 1),
            ({large_plan_id}, 'Unlimited expenses', 'limit', 2),
            ({large_plan_id}, 'Unlimited members per group', 'limit', 3),
            ({large_plan_id}, 'Everything in Friends & Trips', 'capability', 4),
            ({large_plan_id}, 'Advanced analytics & reports', 'capability', 5),
            ({large_plan_id}, 'Custom expense categories', 'capability', 6),
            ({large_plan_id}, 'Priority 24/7 support', 'support', 7),
            ({large_plan_id}, 'Team management & roles', 'capability', 8),
            ({large_plan_id}, 'API access', 'capability', 9),
            ({large_plan_id}, 'Bulk import/export', 'capability', 10);
    """)


def downgrade() -> None:
    """
    Drop subscription_plans and subscription_features tables.
    """
    # Drop tables in reverse order due to foreign key constraints
    op.drop_table('subscription_features')
    op.drop_table('subscription_plans')
