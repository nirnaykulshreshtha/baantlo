import secrets
import base64
import uuid
from typing import Union


def generate_token_128b() -> str:
    """Generate a 128-bit random token encoded as base64url.
    
    This function generates a cryptographically secure random token that can be used
    for temporary IDs or tokens. The output is URL-safe base64 encoded.
    
    Returns:
        str: A 128-bit random token encoded as base64url (22 characters)
    """
    raw = secrets.token_bytes(16)
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def generate_uuid() -> str:
    """Generate a UUID4 string for use as primary keys.
    
    This function generates a standard UUID4 (random UUID) that is suitable
    for use as primary keys in database tables. UUIDs are globally unique
    and provide better security than sequential IDs.
    
    Returns:
        str: A UUID4 string (36 characters including hyphens)
    """
    return str(uuid.uuid4())


def generate_uuid_short() -> str:
    """Generate a short UUID string for use as primary keys.
    
    This function generates a UUID4 and returns it without hyphens, making it
    more compact while maintaining uniqueness. Useful when shorter IDs are preferred.
    
    Returns:
        str: A UUID4 string without hyphens (32 characters)
    """
    return str(uuid.uuid4()).replace('-', '')


def is_valid_uuid(uuid_string: str) -> bool:
    """Check if a string is a valid UUID.
    
    Args:
        uuid_string (str): The string to validate
        
    Returns:
        bool: True if the string is a valid UUID, False otherwise
    """
    try:
        uuid.UUID(uuid_string)
        return True
    except ValueError:
        return False


def generate_entity_id(entity_type: str) -> str:
    """Generate a prefixed UUID for specific entity types.
    
    This function generates a UUID with a prefix to make it easier to identify
    the entity type from the ID. Useful for debugging and logging.
    
    Args:
        entity_type (str): The type of entity (e.g., 'user', 'group', 'expense')
        
    Returns:
        str: A prefixed UUID string
    """
    prefix = entity_type.lower()[:3]  # Use first 3 characters as prefix
    return f"{prefix}_{generate_uuid_short()}"


