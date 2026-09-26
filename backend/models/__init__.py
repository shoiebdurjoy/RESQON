"""
Models Package - Central Export Point
Aggregates all database models and enums for convenient importing.

Usage:
    from models import User, EmergencyRequest, Message, UserRole, EmergencyStatus
"""

# ---- User Model ----
from models.user_model import User, UserRole

# ---- Request Model ----
from models.request_model import (
    EmergencyRequest,
    EmergencyType,
    UrgencyLevel,
    EmergencyStatus
)

# ---- Message Model ----
from models.message_model import Message

# ---- Export List ----
__all__ = [
    'User',
    'UserRole',
    'EmergencyRequest',
    'EmergencyType',
    'UrgencyLevel',
    'EmergencyStatus',
    'Message',
]
