"""
Member 3 Feature: Message Model
Database model for real-time chat communication during emergencies.
Stores messages exchanged between requesters and helpers.

Attributes:
    id: Primary key for message identification
    request_id: Foreign key to EmergencyRequest
    sender_id: Foreign key to User who sent the message
    content: Message text content
    timestamp: When the message was sent
"""

from datetime import datetime
from extensions import db


# ============================================================================
# MESSAGE MODEL
# ============================================================================

class Message(db.Model):
    """
    Message model for real-time chat communication during emergencies.
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
