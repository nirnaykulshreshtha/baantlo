import pytest
from decimal import Decimal
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.db.models import (
    User,
    Group,
    GroupMember,
    Expense,
    ExpenseSplit,
    Settlement,
)
from app.services.balance import calculate_group_balances


SQLALCHEMY_DATABASE_URL = "sqlite:///./test_balance.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class DummyRedis:
    """Simple in-memory stand-in for Redis during tests."""

    def __init__(self) -> None:
        self._store: dict[str, str] = {}

    def get(self, key: str):
        return self._store.get(key)

    def setex(self, key: str, ttl: int, value: str) -> None:
        self._store[key] = value

    def delete(self, key: str) -> None:
        self._store.pop(key, None)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


def test_calculate_group_balances_completed_settlement_offsets_debt(db_session):
    """Completed settlement should neutralize the outstanding balance."""
    user_a = User(
        id="user_a",
        email="user_a@example.com",
        hashed_password="hashed",
        display_name="User A",
        preferred_currency="INR",
        email_verified=True,
        phone_verified=True,
    )
    user_b = User(
        id="user_b",
        email="user_b@example.com",
        hashed_password="hashed",
        display_name="User B",
        preferred_currency="INR",
        email_verified=True,
        phone_verified=True,
    )
    db_session.add_all([user_a, user_b])

    group = Group(
        id="group_1",
        name="Test Group",
        base_currency="INR",
        owner_id=user_a.id,
    )
    db_session.add(group)

    member_a = GroupMember(
        id="member_a",
        group_id=group.id,
        user_id=user_a.id,
        role="owner",
        status="active",
    )
    member_b = GroupMember(
        id="member_b",
        group_id=group.id,
        user_id=user_b.id,
        role="member",
        status="active",
    )
    db_session.add_all([member_a, member_b])

    expense = Expense(
        id="expense_1",
        group_id=group.id,
        payer_id=user_a.id,
        amount=Decimal("100.00"),
        currency="INR",
        amount_inr=Decimal("100.00"),
        description="Dinner",
        expense_date=datetime.utcnow(),
        created_by=user_a.id,
    )
    db_session.add(expense)

    split_a = ExpenseSplit(
        id="split_a",
        expense_id=expense.id,
        user_id=user_a.id,
        amount=Decimal("50.00"),
        amount_inr=Decimal("50.00"),
    )
    split_b = ExpenseSplit(
        id="split_b",
        expense_id=expense.id,
        user_id=user_b.id,
        amount=Decimal("50.00"),
        amount_inr=Decimal("50.00"),
    )
    db_session.add_all([split_a, split_b])

    settlement = Settlement(
        id="settlement_1",
        group_id=group.id,
        from_user_id=user_b.id,
        to_user_id=user_a.id,
        amount=Decimal("50.00"),
        amount_inr=Decimal("50.00"),
        currency="INR",
        method="cash",
        status="completed",
        settled_at=datetime.utcnow(),
        created_by=user_a.id,
    )
    db_session.add(settlement)

    db_session.commit()

    balances = calculate_group_balances(group.id, db_session, DummyRedis())
    balance_map = {balance.user_id: balance.balance_inr for balance in balances}

    assert Decimal("0.00") == balance_map[user_a.id]
    assert Decimal("0.00") == balance_map[user_b.id]
    assert sum(balance_map.values()) == Decimal("0.00")
