"""Convert all string IDs to UUIDs

Revision ID: 005_convert_ids_to_uuid
Revises: 004_add_subscription_plans
Create Date: 2025-01-27 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision = '005_convert_ids_to_uuid'
down_revision = '004_add_subscription_plans'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Convert all string-based primary keys to UUIDs.
    
    This migration:
    1. Adds new UUID columns for all entities
    2. Generates UUIDs for existing records
    3. Updates all foreign key references
    4. Drops old string columns
    5. Renames new columns to original names
    """
    
    # Step 1: Add new UUID columns for all entities
    # Users table
    op.add_column('users', sa.Column('uuid_id', sa.String(36), nullable=True))
    
    # Groups table
    op.add_column('groups', sa.Column('uuid_id', sa.String(36), nullable=True))
    
    # Group members table
    op.add_column('group_members', sa.Column('uuid_id', sa.String(36), nullable=True))
    
    # Expenses table
    op.add_column('expenses', sa.Column('uuid_id', sa.String(36), nullable=True))
    
    # Expense splits table
    op.add_column('expense_splits', sa.Column('uuid_id', sa.String(36), nullable=True))
    
    # Settlements table
    op.add_column('settlements', sa.Column('uuid_id', sa.String(36), nullable=True))
    
    # Group invites table
    op.add_column('group_invites', sa.Column('uuid_id', sa.String(36), nullable=True))
    
    # Friend invites table
    op.add_column('friend_invites', sa.Column('uuid_id', sa.String(36), nullable=True))
    
    # Friendships table
    op.add_column('friendships', sa.Column('uuid_id', sa.String(36), nullable=True))
    
    # Identity claims table
    op.add_column('identity_claims', sa.Column('uuid_id', sa.String(36), nullable=True))
    
    # Refresh tokens table
    op.add_column('refresh_tokens', sa.Column('uuid_jti', sa.String(36), nullable=True))
    
    # Idempotency keys table
    op.add_column('idempotency_keys', sa.Column('uuid_id', sa.String(36), nullable=True))
    
    # Step 2: Generate UUIDs for existing records
    # This is done in Python to ensure proper UUID generation
    connection = op.get_bind()
    
    # Generate UUIDs for users
    users = connection.execute(sa.text("SELECT id FROM users")).fetchall()
    for user in users:
        new_uuid = str(uuid.uuid4())
        connection.execute(
            sa.text("UPDATE users SET uuid_id = :uuid WHERE id = :old_id"),
            {"uuid": new_uuid, "old_id": user[0]}
        )
    
    # Generate UUIDs for groups
    groups = connection.execute(sa.text("SELECT id FROM groups")).fetchall()
    for group in groups:
        new_uuid = str(uuid.uuid4())
        connection.execute(
            sa.text("UPDATE groups SET uuid_id = :uuid WHERE id = :old_id"),
            {"uuid": new_uuid, "old_id": group[0]}
        )
    
    # Generate UUIDs for group members
    group_members = connection.execute(sa.text("SELECT id FROM group_members")).fetchall()
    for member in group_members:
        new_uuid = str(uuid.uuid4())
        connection.execute(
            sa.text("UPDATE group_members SET uuid_id = :uuid WHERE id = :old_id"),
            {"uuid": new_uuid, "old_id": member[0]}
        )
    
    # Generate UUIDs for expenses
    expenses = connection.execute(sa.text("SELECT id FROM expenses")).fetchall()
    for expense in expenses:
        new_uuid = str(uuid.uuid4())
        connection.execute(
            sa.text("UPDATE expenses SET uuid_id = :uuid WHERE id = :old_id"),
            {"uuid": new_uuid, "old_id": expense[0]}
        )
    
    # Generate UUIDs for expense splits
    expense_splits = connection.execute(sa.text("SELECT id FROM expense_splits")).fetchall()
    for split in expense_splits:
        new_uuid = str(uuid.uuid4())
        connection.execute(
            sa.text("UPDATE expense_splits SET uuid_id = :uuid WHERE id = :old_id"),
            {"uuid": new_uuid, "old_id": split[0]}
        )
    
    # Generate UUIDs for settlements
    settlements = connection.execute(sa.text("SELECT id FROM settlements")).fetchall()
    for settlement in settlements:
        new_uuid = str(uuid.uuid4())
        connection.execute(
            sa.text("UPDATE settlements SET uuid_id = :uuid WHERE id = :old_id"),
            {"uuid": new_uuid, "old_id": settlement[0]}
        )
    
    # Generate UUIDs for group invites
    group_invites = connection.execute(sa.text("SELECT id FROM group_invites")).fetchall()
    for invite in group_invites:
        new_uuid = str(uuid.uuid4())
        connection.execute(
            sa.text("UPDATE group_invites SET uuid_id = :uuid WHERE id = :old_id"),
            {"uuid": new_uuid, "old_id": invite[0]}
        )
    
    # Generate UUIDs for friend invites
    friend_invites = connection.execute(sa.text("SELECT id FROM friend_invites")).fetchall()
    for invite in friend_invites:
        new_uuid = str(uuid.uuid4())
        connection.execute(
            sa.text("UPDATE friend_invites SET uuid_id = :uuid WHERE id = :old_id"),
            {"uuid": new_uuid, "old_id": invite[0]}
        )
    
    # Generate UUIDs for friendships
    friendships = connection.execute(sa.text("SELECT id FROM friendships")).fetchall()
    for friendship in friendships:
        new_uuid = str(uuid.uuid4())
        connection.execute(
            sa.text("UPDATE friendships SET uuid_id = :uuid WHERE id = :old_id"),
            {"uuid": new_uuid, "old_id": friendship[0]}
        )
    
    # Generate UUIDs for identity claims
    identity_claims = connection.execute(sa.text("SELECT id FROM identity_claims")).fetchall()
    for claim in identity_claims:
        new_uuid = str(uuid.uuid4())
        connection.execute(
            sa.text("UPDATE identity_claims SET uuid_id = :uuid WHERE id = :old_id"),
            {"uuid": new_uuid, "old_id": claim[0]}
        )
    
    # Generate UUIDs for refresh tokens
    refresh_tokens = connection.execute(sa.text("SELECT jti FROM refresh_tokens")).fetchall()
    for token in refresh_tokens:
        new_uuid = str(uuid.uuid4())
        connection.execute(
            sa.text("UPDATE refresh_tokens SET uuid_jti = :uuid WHERE jti = :old_id"),
            {"uuid": new_uuid, "old_id": token[0]}
        )
    
    # Generate UUIDs for idempotency keys
    idempotency_keys = connection.execute(sa.text("SELECT id FROM idempotency_keys")).fetchall()
    for key in idempotency_keys:
        new_uuid = str(uuid.uuid4())
        connection.execute(
            sa.text("UPDATE idempotency_keys SET uuid_id = :uuid WHERE id = :old_id"),
            {"uuid": new_uuid, "old_id": key[0]}
        )
    
    # Step 3: Update foreign key references to use new UUIDs
    # Update group_members to reference new group and user UUIDs
    connection.execute(sa.text("""
        UPDATE group_members 
        SET group_id = g.uuid_id, user_id = u.uuid_id
        FROM groups g, users u
        WHERE group_members.group_id = g.id AND group_members.user_id = u.id
    """))
    
    # Update expenses to reference new group and user UUIDs
    connection.execute(sa.text("""
        UPDATE expenses 
        SET group_id = g.uuid_id, payer_id = u1.uuid_id, created_by = u2.uuid_id
        FROM groups g, users u1, users u2
        WHERE expenses.group_id = g.id AND expenses.payer_id = u1.id AND expenses.created_by = u2.id
    """))
    
    # Update expense_splits to reference new expense and user UUIDs
    connection.execute(sa.text("""
        UPDATE expense_splits 
        SET expense_id = e.uuid_id, user_id = u.uuid_id
        FROM expenses e, users u
        WHERE expense_splits.expense_id = e.id AND expense_splits.user_id = u.id
    """))
    
    # Update settlements to reference new group and user UUIDs
    connection.execute(sa.text("""
        UPDATE settlements 
        SET group_id = g.uuid_id, from_user_id = u1.uuid_id, to_user_id = u2.uuid_id, created_by = u3.uuid_id
        FROM groups g, users u1, users u2, users u3
        WHERE settlements.group_id = g.id AND settlements.from_user_id = u1.id 
        AND settlements.to_user_id = u2.id AND settlements.created_by = u3.id
    """))
    
    # Update group_invites to reference new group and user UUIDs
    connection.execute(sa.text("""
        UPDATE group_invites 
        SET group_id = g.uuid_id, inviter_id = u1.uuid_id, invitee_user_id = u2.uuid_id
        FROM groups g, users u1, users u2
        WHERE group_invites.group_id = g.id AND group_invites.inviter_id = u1.id 
        AND group_invites.invitee_user_id = u2.id
    """))
    
    # Update friend_invites to reference new user UUIDs
    connection.execute(sa.text("""
        UPDATE friend_invites 
        SET inviter_id = u1.uuid_id, invitee_user_id = u2.uuid_id
        FROM users u1, users u2
        WHERE friend_invites.inviter_id = u1.id AND friend_invites.invitee_user_id = u2.id
    """))
    
    # Update friendships to reference new user UUIDs
    connection.execute(sa.text("""
        UPDATE friendships 
        SET user_a = u1.uuid_id, user_b = u2.uuid_id, initiator = u3.uuid_id
        FROM users u1, users u2, users u3
        WHERE friendships.user_a = u1.id AND friendships.user_b = u2.id AND friendships.initiator = u3.id
    """))
    
    # Update identity_claims to reference new user UUIDs
    connection.execute(sa.text("""
        UPDATE identity_claims 
        SET user_id = u.uuid_id
        FROM users u
        WHERE identity_claims.user_id = u.id
    """))
    
    # Update refresh_tokens to reference new user UUIDs
    connection.execute(sa.text("""
        UPDATE refresh_tokens 
        SET user_id = u.uuid_id
        FROM users u
        WHERE refresh_tokens.user_id = u.id
    """))
    
    # Update idempotency_keys to reference new user UUIDs
    connection.execute(sa.text("""
        UPDATE idempotency_keys 
        SET actor_user_id = u.uuid_id
        FROM users u
        WHERE idempotency_keys.actor_user_id = u.id
    """))
    
    # Update groups to reference new owner UUIDs
    connection.execute(sa.text("""
        UPDATE groups 
        SET owner_id = u.uuid_id
        FROM users u
        WHERE groups.owner_id = u.id
    """))
    
    # Step 4: Make UUID columns NOT NULL
    op.alter_column('users', 'uuid_id', nullable=False)
    op.alter_column('groups', 'uuid_id', nullable=False)
    op.alter_column('group_members', 'uuid_id', nullable=False)
    op.alter_column('expenses', 'uuid_id', nullable=False)
    op.alter_column('expense_splits', 'uuid_id', nullable=False)
    op.alter_column('settlements', 'uuid_id', nullable=False)
    op.alter_column('group_invites', 'uuid_id', nullable=False)
    op.alter_column('friend_invites', 'uuid_id', nullable=False)
    op.alter_column('friendships', 'uuid_id', nullable=False)
    op.alter_column('identity_claims', 'uuid_id', nullable=False)
    op.alter_column('refresh_tokens', 'uuid_jti', nullable=False)
    op.alter_column('idempotency_keys', 'uuid_id', nullable=False)
    
    # Step 5: Drop old columns and rename new ones
    # Drop old primary key columns
    op.drop_column('users', 'id')
    op.drop_column('groups', 'id')
    op.drop_column('group_members', 'id')
    op.drop_column('expenses', 'id')
    op.drop_column('expense_splits', 'id')
    op.drop_column('settlements', 'id')
    op.drop_column('group_invites', 'id')
    op.drop_column('friend_invites', 'id')
    op.drop_column('friendships', 'id')
    op.drop_column('identity_claims', 'id')
    op.drop_column('refresh_tokens', 'jti')
    op.drop_column('idempotency_keys', 'id')
    
    # Rename UUID columns to original names
    op.alter_column('users', 'uuid_id', new_column_name='id')
    op.alter_column('groups', 'uuid_id', new_column_name='id')
    op.alter_column('group_members', 'uuid_id', new_column_name='id')
    op.alter_column('expenses', 'uuid_id', new_column_name='id')
    op.alter_column('expense_splits', 'uuid_id', new_column_name='id')
    op.alter_column('settlements', 'uuid_id', new_column_name='id')
    op.alter_column('group_invites', 'uuid_id', new_column_name='id')
    op.alter_column('friend_invites', 'uuid_id', new_column_name='id')
    op.alter_column('friendships', 'uuid_id', new_column_name='id')
    op.alter_column('identity_claims', 'uuid_id', new_column_name='id')
    op.alter_column('refresh_tokens', 'uuid_jti', new_column_name='jti')
    op.alter_column('idempotency_keys', 'uuid_id', new_column_name='id')


def downgrade() -> None:
    """
    Revert UUID conversion back to string IDs.
    
    This is a complex downgrade that would require storing the original
    string IDs in a separate column during the upgrade process.
    For now, this downgrade is not implemented as it would be very complex
    and potentially data-lossy.
    """
    raise NotImplementedError("UUID to string ID downgrade is not implemented")


