"""
Admin User Seeding Module

This module handles the creation of default admin users and test users during application startup.
It ensures that at least one admin user exists in the system for platform management,
and creates additional test users for development and testing purposes.

Key Features:
- Creates default admin user if none exists
- Creates test users with realistic Indian data
- Configurable admin credentials via environment variables
- Safe seeding that doesn't overwrite existing users
- Comprehensive logging for debugging purposes
- Integration with existing user model and authentication system
- Uses Faker for generating realistic Indian phone numbers
"""

from __future__ import annotations
import logging
import random
from sqlalchemy.orm import Session
from .models.user import User, PlatformRole
from .session import SessionLocal
from .deps import get_db
from ..core.security import hash_password
from ..core.config import settings

logger = logging.getLogger(__name__)

def _admin_credentials() -> tuple[str, str, str, str]:
    """
    Resolve admin credentials, using environment values when provided.

    Production startup validates these values already and will fail early if
    they are missing or insecure, so this helper only provides safe defaults
    for local development.
    """
    return (
        settings.admin_email or "admin@baantlo.local",
        settings.admin_password or "Admin@123",
        settings.admin_display_name or "Baantlo Admin",
        settings.admin_phone or "+919807564282",
    )

# Try to import Faker, fall back to simple generator if not available
try:
    from faker import Faker
    fake = Faker('en_IN')
    FAKER_AVAILABLE = True
    logger.info("Faker is available for generating realistic phone numbers")
except ImportError:
    FAKER_AVAILABLE = False
    logger.warning("Faker not available, using simple phone number generator")


def generate_indian_phone_number() -> str:
    """Generate a realistic Indian phone number."""
    if FAKER_AVAILABLE:
        phone_number = fake.phone_number()
        # Ensure it's a valid Indian mobile number format
        if not phone_number.startswith('+91'):
            phone_number = '+91' + phone_number.replace(' ', '').replace('-', '')
        return phone_number
    else:
        # Fallback: generate a simple Indian mobile number
        # Indian mobile numbers start with 6, 7, 8, or 9
        first_digit = random.choice(['6', '7', '8', '9'])
        remaining_digits = ''.join([str(random.randint(0, 9)) for _ in range(9)])
        return f"+91{first_digit}{remaining_digits}"


def create_default_admin_user(db: Session) -> User | None:
    """
    Create a default admin user if no admin users exist in the system.
    
    Args:
        db: Database session
        
    Returns:
        User: The created admin user, or None if admin already exists
        
    Raises:
        Exception: If there's an error creating the admin user
    """
    try:
        # Check if any admin users already exist
        existing_admin = db.query(User).filter(User.role == PlatformRole.PLATFORM_ADMIN).first()
        if existing_admin:
            logger.info("Admin user already exists: %s", existing_admin.email)
            return existing_admin
        
        admin_email, admin_password, admin_display_name, admin_phone = _admin_credentials()
        logger.info("Creating default admin user with email: %s", admin_email)
        
        # Create the admin user
        admin_user = User(
            email=admin_email,
            hashed_password=hash_password(admin_password),
            role=PlatformRole.PLATFORM_ADMIN,
            display_name=admin_display_name,
            phone=admin_phone,
            preferred_currency="INR",
            email_verified=True,  # Admin users are pre-verified
            phone_verified=True,  # Admin users are pre-verified
            notifications_enabled=True,
            language="en"
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        logger.info("Successfully created default admin user: %s (ID: %s)", 
                   admin_user.email, admin_user.id)
        
        return admin_user
        
    except Exception as e:
        logger.error("Failed to create default admin user: %s", str(e))
        db.rollback()
        raise


def seed_admin_user() -> bool:
    """
    Seed the default admin user during application startup.
    
    This function is called during the FastAPI startup event to ensure
    that at least one admin user exists in the system.
    
    Returns:
        bool: True if admin user was created or already exists, False if failed
    """
    try:
        logger.info("Starting admin user seeding process...")
        
        # Create a new database session for seeding
        db = SessionLocal()
        
        try:
            # Create admin user
            admin_user = create_default_admin_user(db)
            
            if admin_user:
                logger.info("Admin user seeding completed successfully")
                return True
            else:
                logger.warning("No admin user was created during seeding")
                return False
                
        finally:
            db.close()
            
    except Exception as e:
        logger.error("Admin user seeding failed: %s", str(e))
        return False


def verify_admin_user_exists() -> bool:
    """
    Verify that at least one admin user exists in the system.
    
    Returns:
        bool: True if admin user exists, False otherwise
    """
    try:
        db = SessionLocal()
        try:
            admin_user = db.query(User).filter(User.role == PlatformRole.PLATFORM_ADMIN).first()
            return admin_user is not None
        finally:
            db.close()
    except Exception as e:
        logger.error("Failed to verify admin user existence: %s", str(e))
        return False


def get_admin_user_info() -> dict | None:
    """
    Get information about the admin user for debugging and verification.
    
    Returns:
        dict: Admin user information, or None if no admin exists
    """
    try:
        db = SessionLocal()
        try:
            admin_user = db.query(User).filter(User.role == PlatformRole.PLATFORM_ADMIN).first()
            if admin_user:
                return {
                    "id": admin_user.id,
                    "email": admin_user.email,
                    "display_name": admin_user.display_name,
                    "role": admin_user.role,
                    "email_verified": admin_user.email_verified,
                    "phone_verified": admin_user.phone_verified,
                    "preferred_currency": admin_user.preferred_currency,
                    "language": admin_user.language,
                    "notifications_enabled": admin_user.notifications_enabled
                }
            return None
        finally:
            db.close()
    except Exception as e:
        logger.error("Failed to get admin user info: %s", str(e))
        return None


def create_test_users(db: Session) -> list[User]:
    """
    Create test users for development and testing purposes.
    
    Args:
        db: Database session
        
    Returns:
        list[User]: List of created test users
        
    Raises:
        Exception: If there's an error creating test users
    """
    try:
        # Define test users with their details
        test_users_data = [
            {
                "email": "nirnay@example.com",
                "display_name": "Nirnay Kulshreshtha",
                "password": "Test@123"
            },
            {
                "email": "jan@example.com", 
                "display_name": "Janmejay Agrawal",
                "password": "Test@123"
            },
            {
                "email": "jayant@example.com",
                "display_name": "Jayant Kumar Singh", 
                "password": "Test@123"
            },
            {
                "email": "ankit@example.com",
                "display_name": "Ankit Verma",
                "password": "Test@123"
            },
            {
                "email": "amit@example.com",
                "display_name": "Amit Singh Chauhan",
                "password": "Test@123"
            }
        ]
        
        created_users = []
        
        for user_data in test_users_data:
            # Check if user already exists
            existing_user = db.query(User).filter(User.email == user_data["email"]).first()
            if existing_user:
                logger.info("Test user already exists: %s", user_data["email"])
                created_users.append(existing_user)
                continue
            
            # Generate Indian phone number
            phone_number = generate_indian_phone_number()
            
            logger.info("Creating test user: %s", user_data["email"])
            
            # Create the test user
            test_user = User(
                email=user_data["email"],
                hashed_password=hash_password(user_data["password"]),
                role=PlatformRole.BASIC_USER,
                display_name=user_data["display_name"],
                phone=phone_number,
                preferred_currency="INR",
                email_verified=True,  # Test users are pre-verified
                phone_verified=True,  # Test users are pre-verified
                notifications_enabled=True,
                language="en"
            )
            
            db.add(test_user)
            created_users.append(test_user)
            
            logger.info("Successfully created test user: %s (ID: %s, Phone: %s)", 
                       test_user.email, test_user.id, test_user.phone)
        
        db.commit()
        
        # Refresh all users to get their IDs
        for user in created_users:
            db.refresh(user)
        
        logger.info("Successfully created %d test users", len(created_users))
        return created_users
        
    except Exception as e:
        logger.error("Failed to create test users: %s", str(e))
        db.rollback()
        raise


def seed_all_users() -> bool:
    """
    Seed both admin and test users during application startup.
    
    This function creates the default admin user and test users
    for development and testing purposes.
    
    Returns:
        bool: True if all users were created successfully, False if failed
    """
    try:
        logger.info("Starting comprehensive user seeding process...")
        
        # Create a new database session for seeding
        db = SessionLocal()
        
        try:
            # Create admin user
            admin_user = create_default_admin_user(db)
            admin_created = admin_user is not None
            
            # Create test users
            test_users = create_test_users(db)
            test_users_created = len(test_users) > 0
            
            if admin_created or test_users_created:
                logger.info("User seeding completed successfully")
                logger.info("Admin user exists: %s", admin_created)
                logger.info("Test users created: %d", len(test_users))
                return True
            else:
                logger.warning("No users were created during seeding")
                return False
                
        finally:
            db.close()
            
    except Exception as e:
        logger.error("User seeding failed: %s", str(e))
        return False


def get_all_users_info() -> dict:
    """
    Get information about all users for debugging and verification.
    
    Returns:
        dict: Information about all users in the system
    """
    try:
        db = SessionLocal()
        try:
            all_users = db.query(User).all()
            users_info = []
            
            for user in all_users:
                users_info.append({
                    "id": user.id,
                    "email": user.email,
                    "display_name": user.display_name,
                    "role": user.role,
                    "phone": user.phone,
                    "email_verified": user.email_verified,
                    "phone_verified": user.phone_verified,
                    "preferred_currency": user.preferred_currency,
                    "language": user.language,
                    "notifications_enabled": user.notifications_enabled
                })
            
            return {
                "total_users": len(users_info),
                "admin_users": len([u for u in users_info if u["role"] == PlatformRole.PLATFORM_ADMIN]),
                "basic_users": len([u for u in users_info if u["role"] == PlatformRole.BASIC_USER]),
                "users": users_info
            }
        finally:
            db.close()
    except Exception as e:
        logger.error("Failed to get all users info: %s", str(e))
        return {"error": str(e)}
