"""
Member 1 Feature: Emergency Request Creation Routes
Handles creation of new emergency requests by requesters.

Routes:
  POST   /api/emergency/create  - Create a new emergency request [JWT Required]
"""

import os
from datetime import datetime
from functools import wraps

from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from twilio.base.exceptions import TwilioRestException
from twilio.rest import Client

from extensions import db, socketio
from models import User, UserRole, EmergencyRequest, EmergencyType, UrgencyLevel, EmergencyStatus

# ============================================================================
# Blueprint Definition
# ============================================================================

bp = Blueprint('member1_request', __name__)


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _parse_enum(enum_cls, raw_value):
    """
    Parse an enum from user input using case-insensitive matching by value or name.
    
    Example: "blood", "Blood", "BLOOD" all parse to EmergencyType.BLOOD
    """
    if raw_value is None:
        return None
    
    text = str(raw_value).strip()
    if not text:
        return None
    
    for member in enum_cls:
        if text.lower() == member.value.lower() or text.upper() == member.name:
            return member
    
    return None


def _send_sms(to_phone, body):
    """
    Send SMS via Twilio in a safe, non-blocking way.
    Any failure is swallowed so SMS problems never break API responses.
    """
    account_sid = os.getenv('TWILIO_ACCOUNT_SID')
    auth_token = os.getenv('TWILIO_AUTH_TOKEN')
    from_phone = os.getenv('TWILIO_PHONE_NUMBER')
    
    if not account_sid or not auth_token or not from_phone or not to_phone:
        return
    
    try:
        client = Client(account_sid, auth_token)
        client.messages.create(
            body=body,
            from_=from_phone,
            to=to_phone,
        )
    except (TwilioRestException, Exception):
        pass


def requester_required(fn):
    """Decorator that requires JWT token and requester role."""
    @wraps(fn)
    @jwt_required()
    def wrapped(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if user.role != UserRole.REQUESTER:
            return jsonify({'error': 'Forbidden: requester role required'}), 403
        
        g.current_requester = user
        return fn(*args, **kwargs)
    
    return wrapped


# ============================================================================
# ROUTE: POST /api/emergency/create
# ============================================================================

@bp.route('/api/emergency/create', methods=['POST'])
@requester_required
def create_emergency_request():
    """
    Create a new emergency request as requester.
    
    Request Body (JSON):
        - emergency_type (str): Type of emergency (blood, ambulance, oxygen)
        - description (str): Detailed description of the emergency
        - urgency_level (str): Priority level (low, medium, high)
        - latitude (float): Location latitude
        - longitude (float): Location longitude
    
    Returns:
        JSON: {
            'message': 'Emergency request created successfully',
            'request': { ...emergency_request_data... }
        }, 201
    
    Errors:
        400: Missing required fields or invalid values
        500: Database failure
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body must be JSON'}), 400
    
    # Validate required fields
    required_fields = ['emergency_type', 'description', 'urgency_level', 'latitude', 'longitude']
    missing = [field for field in required_fields if data.get(field) in (None, '')]
    if missing:
        return jsonify({'error': f"Missing required fields: {', '.join(missing)}"}), 400
    
    # Parse and validate emergency type
    emergency_type = _parse_enum(EmergencyType, data.get('emergency_type'))
    if not emergency_type:
        return jsonify({'error': 'Invalid emergency_type'}), 400
    
    # Parse and validate urgency level
    urgency_level = _parse_enum(UrgencyLevel, data.get('urgency_level'))
    if not urgency_level:
        return jsonify({'error': 'Invalid urgency_level'}), 400
    
    # Validate location coordinates
    try:
        latitude = float(data.get('latitude'))
        longitude = float(data.get('longitude'))
    except (TypeError, ValueError):
        return jsonify({'error': 'latitude and longitude must be numeric'}), 400
    
    # Create emergency request with PENDING status
    emergency = EmergencyRequest(
        requester_id=g.current_requester.id,
        emergency_type=emergency_type,
        description=str(data.get('description')).strip(),
        urgency_level=urgency_level,
        status=EmergencyStatus.PENDING,
        latitude=latitude,
        longitude=longitude,
    )
    
    try:
        db.session.add(emergency)
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Failed to create emergency request'}), 500
    
    # Broadcast new emergency to all connected clients
    socketio.emit('new_emergency_request', {
        'request': emergency.to_dict(),
    })
    
    return jsonify({
        'message': 'Emergency request created successfully',
        'request': emergency.to_dict(),
    }), 201
