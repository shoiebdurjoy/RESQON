"""
Member 2 Feature: Emergency Request Model
Database model for emergency requests with status tracking and location data.
Manages emergency lifecycle (pending → accepted → completed/cancelled).

Attributes:
    id: Primary key for request identification
    requester_id: Foreign key to User who created the request
    helper_id: Foreign key to User (helper) who accepted the request
    emergency_type: Type of emergency (BLOOD, AMBULANCE, OXYGEN)
    description: Detailed emergency description
    urgency_level: Priority level (LOW, MEDIUM, HIGH)
    status: Current request status (PENDING, ACCEPTED, COMPLETED, CANCELLED)
    latitude, longitude: Location coordinates
    created_at, accepted_at, completed_at: Timestamp tracking
"""

from datetime import datetime
import enum
from extensions import db


# ============================================================================
# ENUMERATIONS
# ============================================================================

class EmergencyType(enum.Enum):
    """Emergency type enumeration"""
    BLOOD = "blood"
    AMBULANCE = "ambulance"
    OXYGEN = "oxygen"


class UrgencyLevel(enum.Enum):
    """Urgency level enumeration"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class EmergencyStatus(enum.Enum):
    """Emergency request status enumeration"""
    PENDING = "pending"
    ACCEPTED = "accepted"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


# ============================================================================
# EMERGENCY REQUEST MODEL
# ============================================================================

class EmergencyRequest(db.Model):
    """
    Emergency request model for tracking emergency cases.
    """
    __tablename__ = 'emergency_requests'
    
    # ---- Primary Key ----
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # ---- Foreign Keys ----
    requester_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    helper_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='SET NULL'),
        nullable=True,
        index=True
    )
    
    # ---- Emergency Details ----
    emergency_type = db.Column(db.Enum(EmergencyType), nullable=False, index=True)
    description = db.Column(db.Text, nullable=False)
    urgency_level = db.Column(db.Enum(UrgencyLevel), nullable=False, index=True)
    
    # ---- Status ----
    status = db.Column(
        db.Enum(EmergencyStatus),
        default=EmergencyStatus.PENDING,
        nullable=False,
        index=True
    )
    
    # ---- Location Information ----
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    
    # ---- Timestamps ----
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    accepted_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    
    # ---- Relationships ----
    # Messages related to this emergency
    messages = db.relationship(
        'Message',
        backref='emergency_request',
        cascade='all, delete-orphan'
    )
    
    # ---- Methods ----
    
    def to_dict(self):
        """
        Convert emergency request object to dictionary for JSON serialization.
        
        Returns:
            dict: Emergency request data dictionary safe for API responses
        """
        return {
            'id': self.id,
            'requester': self.requester.to_dict(),
            'helper': self.helper.to_dict() if self.helper else None,
            'emergency_type': self.emergency_type.value,
            'description': self.description,
            'urgency_level': self.urgency_level.value,
            'status': self.status.value,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'created_at': self.created_at.isoformat(),
            'accepted_at': self.accepted_at.isoformat() if self.accepted_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
        }
    
    def __repr__(self):
        """String representation of EmergencyRequest object for debugging."""
        return (
            f'<EmergencyRequest id={self.id} type={self.emergency_type.value} '
            f'status={self.status.value} requester_id={self.requester_id} '
            f'helper_id={self.helper_id}>'
        )
