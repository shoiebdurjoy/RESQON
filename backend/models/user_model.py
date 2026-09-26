"""
Member 1 Feature: User Model
Database model for user accounts with authentication data.
Handles user information, password hashing, and role-based attributes.

Attributes:
    id: Primary key for user identification
    name: User's full name
    email: Unique email address
    password_hash: Bcrypt-hashed password
    role: UserRole (REQUESTER or HELPER)
    phone: Contact phone number
    blood_group: Blood type (for requesters)
    skills: Comma-separated list of helper skills
    is_available: Helper availability status
    created_at: Account creation timestamp
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


# ============================================================================
# USER MODEL
# ============================================================================

class User(db.Model):
    """
    User model for storing user information and authentication data.
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
