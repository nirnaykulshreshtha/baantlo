import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from decimal import Decimal
from datetime import datetime

from app.main import app
from app.db.base import Base
from app.db.models import User, Group, GroupMember
from app.auth.tokens import create_access_token

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def test_user(db_session):
    user = User(
        id="test_user_1",
        email="test@example.com",
        hashed_password="hashed_password",
        display_name="Test User",
        preferred_currency="INR",
        email_verified=True,
        phone_verified=True
    )
    db_session.add(user)
    db_session.commit()
    return user

@pytest.fixture(scope="function")
def test_group(db_session, test_user):
    group = Group(
        id="test_group_1",
        name="Test Group",
        base_currency="INR",
        owner_id=test_user.id
    )
    db_session.add(group)
    
    # Add user as group member
    member = GroupMember(
        id="test_member_1",
        group_id=group.id,
        user_id=test_user.id,
        role="owner",
        status="active"
    )
    db_session.add(member)
    db_session.commit()
    return group

@pytest.fixture(scope="function")
def auth_headers(test_user):
    token = create_access_token({"sub": test_user.id, "roles": ["BASIC_USER"]})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="function")
def client():
    return TestClient(app)

def test_create_expense_success(client, db_session, test_user, test_group, auth_headers):
    """Test successful expense creation"""
    expense_data = {
        "group_id": test_group.id,
        "payer_id": test_user.id,
        "amount": 100.50,
        "currency": "INR",
        "description": "Test expense",
        "expense_date": datetime.now().isoformat(),
        "splits": [
            {"user_id": test_user.id, "amount": 100.50}
        ]
    }
    
    response = client.post("/api/v1/expenses", json=expense_data, headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] is not None
    assert data["group_id"] == test_group.id
    assert data["payer_id"] == test_user.id
    assert data["amount"] == 100.50
    assert data["description"] == "Test expense"

def test_create_expense_validation_error(client, db_session, test_user, test_group, auth_headers):
    """Test expense creation with validation error"""
    expense_data = {
        "group_id": test_group.id,
        "payer_id": test_user.id,
        "amount": -100,  # Invalid negative amount
        "currency": "INR",
        "description": "Test expense",
        "expense_date": datetime.now().isoformat(),
        "splits": [
            {"user_id": test_user.id, "amount": -100}
        ]
    }
    
    response = client.post("/api/v1/expenses", json=expense_data, headers=auth_headers)
    
    assert response.status_code == 400

def test_get_group_expenses(client, db_session, test_user, test_group, auth_headers):
    """Test fetching group expenses"""
    response = client.get(f"/api/v1/expenses/group/{test_group.id}", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "page_size" in data

def test_get_expense_not_found(client, db_session, test_user, auth_headers):
    """Test fetching non-existent expense"""
    response = client.get("/api/v1/expenses/non_existent_id", headers=auth_headers)
    
    assert response.status_code == 404

def test_create_expense_unauthorized(client, db_session, test_group):
    """Test expense creation without authentication"""
    expense_data = {
        "group_id": test_group.id,
        "payer_id": "user1",
        "amount": 100.50,
        "currency": "INR",
        "description": "Test expense",
        "expense_date": datetime.now().isoformat(),
        "splits": [
            {"user_id": "user1", "amount": 100.50}
        ]
    }
    
    response = client.post("/api/v1/expenses", json=expense_data)
    
    assert response.status_code == 401

def test_create_expense_invalid_group(client, db_session, test_user, auth_headers):
    """Test expense creation with invalid group"""
    expense_data = {
        "group_id": "non_existent_group",
        "payer_id": test_user.id,
        "amount": 100.50,
        "currency": "INR",
        "description": "Test expense",
        "expense_date": datetime.now().isoformat(),
        "splits": [
            {"user_id": test_user.id, "amount": 100.50}
        ]
    }
    
    response = client.post("/api/v1/expenses", json=expense_data, headers=auth_headers)
    
    assert response.status_code == 404

def test_create_expense_split_validation(client, db_session, test_user, test_group, auth_headers):
    """Test expense creation with invalid split amounts"""
    expense_data = {
        "group_id": test_group.id,
        "payer_id": test_user.id,
        "amount": 100.0,
        "currency": "INR",
        "description": "Test expense",
        "expense_date": datetime.now().isoformat(),
        "splits": [
            {"user_id": test_user.id, "amount": 60.0},  # Total doesn't match
            {"user_id": test_user.id, "amount": 50.0}
        ]
    }
    
    response = client.post("/api/v1/expenses", json=expense_data, headers=auth_headers)
    
    assert response.status_code == 400
