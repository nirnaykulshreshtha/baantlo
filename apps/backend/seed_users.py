#!/usr/bin/env python3
"""
Manual User Seeding Script

This script allows you to manually seed users into the database.
It can be run independently of the main application for testing purposes.

Usage:
    python seed_users.py

Environment Variables:
    ADMIN_EMAIL: Admin user email (default: admin@baantlo.com)
    ADMIN_PASSWORD: Admin user password (default: Admin@123)
    ADMIN_DISPLAY_NAME: Admin user display name (default: Baantlo Admin)
    ADMIN_PHONE: Admin user phone (default: 9876543210)
"""

import os
import sys
import logging
from pathlib import Path

# Add the app directory to Python path
app_dir = Path(__file__).parent / "app"
sys.path.insert(0, str(app_dir))

from app.db.seed_admin import seed_all_users, get_all_users_info

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def main():
    """Main function to seed users."""
    try:
        print("🌱 Starting manual user seeding...")
        print("=" * 50)
        
        # Check environment
        environment = os.getenv("ENVIRONMENT", "development")
        print(f"Environment: {environment}")
        
        # Seed users
        success = seed_all_users()
        
        if success:
            print("✅ User seeding completed successfully!")
            print("=" * 50)
            
            # Get and display user information
            users_info = get_all_users_info()
            
            if users_info and "error" not in users_info:
                print(f"📊 User Statistics:")
                print(f"   Total users: {users_info['total_users']}")
                print(f"   Admin users: {users_info['admin_users']}")
                print(f"   Basic users: {users_info['basic_users']}")
                print()
                
                print("👥 User Details:")
                for user in users_info['users']:
                    role_emoji = "👑" if user['role'] == 'PLATFORM_ADMIN' else "👤"
                    print(f"   {role_emoji} {user['display_name']} ({user['email']})")
                    print(f"      ID: {user['id']}")
                    print(f"      Phone: {user['phone']}")
                    print(f"      Role: {user['role']}")
                    print()
            else:
                print("⚠️  Could not retrieve user information")
        else:
            print("❌ User seeding failed!")
            return 1
            
    except Exception as e:
        logger.error(f"Seeding failed: {str(e)}")
        print(f"❌ Error: {str(e)}")
        return 1
    
    return 0


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
