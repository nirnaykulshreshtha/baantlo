"""
Group Types Configuration

This module defines the configuration for different group types including:
- Default expense categories
- Settlement preferences
- UI metadata (icons, colors, descriptions)
- Type-specific behaviors

Author: Baant Lo Team
Created: 2024
"""

from typing import Dict, List, Any
from enum import Enum


class GroupType(str, Enum):
    """Enumeration of supported group types"""
    TRIP = "trip"
    HOME = "home"
    COUPLE = "couple"
    PERSONAL = "personal"
    BUSINESS = "business"
    EVENT = "event"
    OTHER = "other"


class SettlementPreference(str, Enum):
    """Settlement preferences for different group types"""
    SIMPLIFIED = "simplified"  # 1:1 direct settlement
    DETAILED = "detailed"      # Detailed tracking with receipts
    STANDARD = "standard"      # Standard multi-party settlement


# Default expense categories for each group type
DEFAULT_CATEGORIES: Dict[GroupType, List[str]] = {
    GroupType.TRIP: [
        "Transport",
        "Accommodation", 
        "Food & Dining",
        "Activities",
        "Shopping",
        "Miscellaneous"
    ],
    GroupType.HOME: [
        "Rent",
        "Utilities",
        "Groceries",
        "Household Items",
        "Maintenance",
        "Miscellaneous"
    ],
    GroupType.COUPLE: [
        "Dining",
        "Entertainment",
        "Groceries",
        "Travel",
        "Gifts",
        "Miscellaneous"
    ],
    GroupType.PERSONAL: [
        "General",
        "Food",
        "Shopping",
        "Entertainment",
        "Miscellaneous"
    ],
    GroupType.BUSINESS: [
        "Meals",
        "Travel",
        "Supplies",
        "Services",
        "Miscellaneous"
    ],
    GroupType.EVENT: [
        "Venue",
        "Catering",
        "Decorations",
        "Entertainment",
        "Supplies",
        "Miscellaneous"
    ],
    GroupType.OTHER: [
        "General",
        "Miscellaneous"
    ]
}

# Settlement preferences for each group type
SETTLEMENT_PREFERENCES: Dict[GroupType, SettlementPreference] = {
    GroupType.COUPLE: SettlementPreference.SIMPLIFIED,
    GroupType.BUSINESS: SettlementPreference.DETAILED,
    GroupType.TRIP: SettlementPreference.STANDARD,
    GroupType.HOME: SettlementPreference.STANDARD,
    GroupType.PERSONAL: SettlementPreference.STANDARD,
    GroupType.EVENT: SettlementPreference.STANDARD,
    GroupType.OTHER: SettlementPreference.STANDARD,
}

# UI metadata for each group type
UI_METADATA: Dict[GroupType, Dict[str, Any]] = {
    GroupType.TRIP: {
        "label": "Trip",
        "description": "Perfect for travel and vacation expenses",
        "icon": "🌍",
        "color": "#0ea5e9",  # Blue/Teal
        "bg_color": "#f0f9ff",
        "text_color": "#0c4a6e"
    },
    GroupType.HOME: {
        "label": "Home",
        "description": "Ideal for household and roommate expenses",
        "icon": "🏠",
        "color": "#22c55e",  # Green
        "bg_color": "#f0fdf4",
        "text_color": "#14532d"
    },
    GroupType.COUPLE: {
        "label": "Couple",
        "description": "Simplified expense tracking for partners",
        "icon": "💑",
        "color": "#ec4899",  # Pink/Red
        "bg_color": "#fdf2f8",
        "text_color": "#831843"
    },
    GroupType.PERSONAL: {
        "label": "Personal",
        "description": "For personal group expense tracking",
        "icon": "👤",
        "color": "#8b5cf6",  # Purple
        "bg_color": "#faf5ff",
        "text_color": "#581c87"
    },
    GroupType.BUSINESS: {
        "label": "Business",
        "description": "Professional expense splitting and tracking",
        "icon": "💼",
        "color": "#374151",  # Navy/Gray
        "bg_color": "#f9fafb",
        "text_color": "#111827"
    },
    GroupType.EVENT: {
        "label": "Event",
        "description": "Perfect for parties and event planning",
        "icon": "🎉",
        "color": "#f59e0b",  # Orange/Yellow
        "bg_color": "#fffbeb",
        "text_color": "#92400e"
    },
    GroupType.OTHER: {
        "label": "Other",
        "description": "General purpose expense splitting",
        "icon": "⚪",
        "color": "#6b7280",  # Neutral/Gray
        "bg_color": "#f9fafb",
        "text_color": "#374151"
    }
}


def get_group_type_config(group_type: GroupType) -> Dict[str, Any]:
    """
    Get complete configuration for a group type
    
    Args:
        group_type: The group type to get configuration for
        
    Returns:
        Dictionary containing all configuration for the group type
    """
    return {
        "type": group_type,
        "categories": DEFAULT_CATEGORIES.get(group_type, []),
        "settlement_preference": SETTLEMENT_PREFERENCES.get(group_type, SettlementPreference.STANDARD),
        "ui": UI_METADATA.get(group_type, {})
    }


def get_all_group_types() -> List[Dict[str, Any]]:
    """
    Get configuration for all group types
    
    Returns:
        List of dictionaries containing configuration for all group types
    """
    return [get_group_type_config(group_type) for group_type in GroupType]


def get_default_categories(group_type: GroupType) -> List[str]:
    """
    Get default expense categories for a group type
    
    Args:
        group_type: The group type
        
    Returns:
        List of default category names
    """
    return DEFAULT_CATEGORIES.get(group_type, ["General", "Miscellaneous"])


def get_settlement_preference(group_type: GroupType) -> SettlementPreference:
    """
    Get settlement preference for a group type
    
    Args:
        group_type: The group type
        
    Returns:
        Settlement preference for the group type
    """
    return SETTLEMENT_PREFERENCES.get(group_type, SettlementPreference.STANDARD)
