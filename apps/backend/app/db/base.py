from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from ..utils.ids import generate_uuid


class Base(DeclarativeBase):
    """Base class for all database models.
    
    This class provides common functionality for all database models including
    UUID primary key generation and common audit fields. All models should
    inherit from this base class.
    """
    pass


def generate_id() -> str:
    """Generate a UUID for use as primary key.
    
    This function is used by SQLAlchemy to automatically generate UUIDs
    for primary keys when creating new records.
    
    Returns:
        str: A UUID4 string
    """
    return generate_uuid()

