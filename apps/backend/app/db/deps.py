from collections.abc import Generator
from .session import SessionLocal


def get_db() -> Generator:
    """
    Get database session with optimized configuration.
    
    This dependency provides a database session that is automatically
    closed after the request completes, ensuring proper resource cleanup.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

