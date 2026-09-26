"""
Database Models for Smart Emergency System (PostgreSQL)
Defines all database tables, relationships, and helper methods for the emergency coordination system.
"""

from datetime import datetime
import enum
from extensions import db
from flask_bcrypt import generate_password_hash, check_password_hash


# ============================================================================
# ENUMERATIONS
# ============================================================================

class UserRole(enum.Enum):
    """User role enumeration"""
    REQUESTER = "requester"
    HELPER = "helper"


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
# MODEL 1: USER
# ============================================================================

class User(db.Model):
    """
    User model for storing user information and authentication data.
    
    Attributes:
        id (int): Primary key
        name (str): User's full name
        email (str): User's email address (unique)
        password_hash (str): Hashed password using bcrypt
        role (UserRole): User role - 'requester' or 'helper'
        phone (str): User's phone number
        blood_group (str): Blood group (relevant for requesters)
        skills (str): Comma-separated list of skills (for helpers)
        is_available (bool): Helper availability status
        created_at (datetime): Account creation timestamp
    """
    __tablename__ = 'users'
    
    # ---- Primary Key ----
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # ---- Basic Information ----
    name = db.Column(db.String(120), nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    blood_group = db.Column(db.String(5), nullable=True)  # e.g., "O+", "B-"
    
    # ---- Role and Availability ----
    role = db.Column(db.Enum(UserRole), nullable=False, index=True)
    is_available = db.Column(db.Boolean, default=False, nullable=False)
    
    # ---- Helper-specific Info ----
    skills = db.Column(db.Text, nullable=True)  # Comma-separated skills
    
    # ---- Timestamp ----
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # ---- Relationships ----
    # Emergency requests created by this user
    emergency_requests_created = db.relationship(
        'EmergencyRequest',
        backref='requester',
        foreign_keys='EmergencyRequest.requester_id',
        cascade='all, delete-orphan'
    )
    
    # Emergency requests accepted by this helper
    emergency_requests_accepted = db.relationship(
        'EmergencyRequest',
        backref='helper',
        foreign_keys='EmergencyRequest.helper_id'
    )
    
    # Messages sent by this user
    messages = db.relationship(
        'Message',
        backref='sender',
        cascade='all, delete-orphan'
    )
    
    # ---- Methods ----
    
    def set_password(self, password):
        """
        Hash and set the user's password using bcrypt.
        
        Args:
            password (str): Plain text password to hash
        """
        self.password_hash = generate_password_hash(password).decode('utf-8')
    
    def check_password(self, password):
        """
        Verify a plain text password against the stored hash.
        
        Args:
            password (str): Plain text password to verify
            
        Returns:
            bool: True if password matches, False otherwise
        """
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        """
        Convert user object to dictionary for JSON serialization.
        
        Returns:
            dict: User data dictionary safe for API responses
        """
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'blood_group': self.blood_group,
            'role': self.role.value,
            'is_available': self.is_available,
            'skills': self.skills.split(',') if self.skills else [],
            'created_at': self.created_at.isoformat(),
        }
    
    def __repr__(self):
        """String representation of User object for debugging."""
        return f'<User id={self.id} name="{self.name}" email="{self.email}" role={self.role.value}>'


# ============================================================================
# MODEL 2: EMERGENCY REQUEST
# ============================================================================

class EmergencyRequest(db.Model):
    """
    Emergency request model for tracking emergency cases.
    
    Attributes:
        id (int): Primary key
        requester_id (int): Foreign key to User (requester)
        helper_id (int): Foreign key to User (helper), nullable
        emergency_type (EmergencyType): Type of emergency (Blood/Ambulance/Oxygen)
        description (str): Detailed description of emergency
        urgency_level (UrgencyLevel): How urgent is the request (Low/Medium/High)
        status (EmergencyStatus): Current status of request (Pending/Accepted/Completed/Cancelled)
        latitude (float): Location latitude
        longitude (float): Location longitude
        created_at (datetime): Request creation time
        accepted_at (datetime): When helper accepted, nullable
        completed_at (datetime): When request was completed, nullable
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


# ============================================================================
# MODEL 3: MESSAGE
# ============================================================================

class Message(db.Model):
    """
    Message model for real-time chat communication during emergencies.
    
    Attributes:
        id (int): Primary key
        request_id (int): Foreign key to EmergencyRequest
        sender_id (int): Foreign key to User (message sender)
        content (str): Message content/text
        timestamp (datetime): When message was sent
    """
    __tablename__ = 'messages'
    
    # ---- Primary Key ----
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # ---- Foreign Keys ----
    request_id = db.Column(
        db.Integer,
        db.ForeignKey('emergency_requests.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    sender_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # ---- Message Content ----
    content = db.Column(db.Text, nullable=False)
    
    # ---- Timestamp ----
    timestamp = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )
    
    # ---- Methods ----
    
    def to_dict(self):
        """
        Convert message object to dictionary for JSON serialization.
        
        Returns:
            dict: Message data dictionary safe for API responses
        """
        return {
            'id': self.id,
            'request_id': self.request_id,
            'sender': self.sender.to_dict(),
            'content': self.content,
            'timestamp': self.timestamp.isoformat(),
        }
    
    def __repr__(self):
        """String representation of Message object for debugging."""
        return (
            f'<Message id={self.id} request_id={self.request_id} '
            f'sender_id={self.sender_id} timestamp={self.timestamp.isoformat()}>'
        )


# ============================================================================
# DATABASE INDEXING SUMMARY
# ============================================================================

"""
Indexed columns for optimal query performance in PostgreSQL:

Users Table:
- email (unique index) - for fast login lookups
- name - for search functionality
- role - for filtering by user type
- created_at - for chronological queries

EmergencyRequest Table:
- requester_id - for finding requests by requester
- helper_id - for finding requests assigned to helper
- emergency_type - for filtering by type
- urgency_level - for priority-based queries
- status - for filtering by request status
- created_at - for recent requests

Message Table:
- request_id - for retrieving conversation history
- sender_id - for user activity tracking
- timestamp - for message ordering

These indexes significantly improve query performance in high-volume scenarios.
"""
