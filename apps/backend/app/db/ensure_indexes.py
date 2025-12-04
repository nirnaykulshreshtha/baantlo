from __future__ import annotations
import logging
from sqlalchemy import text
from .session import engine

logger = logging.getLogger(__name__)

INDEX_DEFINITIONS: dict[str, list[str]] = {
    "friend_invites": [
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_friend_invite_pending
        ON friend_invites (inviter_id, invitee_claim_type, invitee_claim_value)
        WHERE status = 'pending';
        """,
    ],
    "group_invites": [
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_group_invite_pending
        ON group_invites (group_id, invitee_claim_type, invitee_claim_value)
        WHERE status = 'pending';
        """,
    ],
    "identity_claims": [
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_only_one_primary_per_type
        ON identity_claims (user_id, claim_type)
        WHERE is_primary = true;
        """,
    ],
    "expenses": [
        """
        CREATE INDEX IF NOT EXISTS idx_expenses_group_deleted_created
        ON expenses (group_id, deleted_at, created_at DESC);
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_expenses_group_payer_date
        ON expenses (group_id, payer_id, expense_date DESC);
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_expenses_amount_range
        ON expenses (amount_inr, group_id) WHERE deleted_at IS NULL;
        """,
    ],
    "expense_splits": [
        """
        CREATE INDEX IF NOT EXISTS idx_expense_splits_user_amount
        ON expense_splits (user_id, amount_inr);
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_user
        ON expense_splits (expense_id, user_id);
        """,
    ],
    "group_members": [
        """
        CREATE INDEX IF NOT EXISTS idx_group_members_user_group
        ON group_members (user_id, group_id);
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_group_members_group_role
        ON group_members (group_id, role);
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_group_members_user_status
        ON group_members (user_id, status);
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_group_members_group_status
        ON group_members (group_id, status);
        """,
    ],
    "subscription_plans": [
        """
        CREATE INDEX IF NOT EXISTS idx_subscription_plans_active_order
        ON subscription_plans (is_active, display_order) WHERE is_active = true;
        """,
    ],
    "subscription_features": [
        """
        CREATE INDEX IF NOT EXISTS idx_subscription_features_plan_order
        ON subscription_features (plan_id, display_order);
        """,
    ],
    "user_sessions": [
        """
        CREATE INDEX IF NOT EXISTS idx_user_sessions_user_created
        ON user_sessions (user_id, created_at DESC);
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_user_sessions_token
        ON user_sessions (token_hash);
        """,
    ],
    "audit_logs": [
        """
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
        ON audit_logs (user_id, created_at DESC);
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_created
        ON audit_logs (entity_type, entity_id, created_at DESC);
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_entity
        ON audit_logs (actor_user_id, entity_type, created_at DESC);
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_action
        ON audit_logs (entity_type, entity_id, action, created_at DESC);
        """,
    ],
    "settlements": [
        """
        CREATE INDEX IF NOT EXISTS idx_settlements_group_status
        ON settlements (group_id, status);
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_settlements_from_user
        ON settlements (from_user_id, status);
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_settlements_to_user
        ON settlements (to_user_id, status);
        """,
    ],
    "sync_ops": [
        """
        CREATE INDEX IF NOT EXISTS idx_sync_ops_user_seq
        ON sync_ops (user_id, seq DESC);
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_sync_ops_entity
        ON sync_ops (entity_type, entity_id);
        """,
    ],
    "notifications": [
        """
        CREATE INDEX IF NOT EXISTS idx_notifications_user_status
        ON notifications (user_id, status, created_at DESC);
        """,
    ],
    "refresh_tokens": [
        """
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_expires
        ON refresh_tokens (user_id, expires_at);
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token
        ON refresh_tokens (token);
        """,
    ],
}


def _table_exists(conn, table_name: str) -> bool:
    result = conn.execute(
        text("SELECT to_regclass(:table)"),
        {"table": f"public.{table_name}"},
    ).scalar()
    return result is not None


def ensure_indexes() -> None:
    """
    Ensure all critical database indexes are created for optimal performance.
    This function skips index creation for tables that have not yet been created.
    """
    with engine.begin() as conn:
        for table_name, statements in INDEX_DEFINITIONS.items():
            if not _table_exists(conn, table_name):
                logger.debug("Skipping index creation for missing table %s", table_name)
                continue
            for statement in statements:
                conn.execute(text(statement))

