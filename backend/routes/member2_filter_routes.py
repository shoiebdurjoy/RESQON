"""
Member 2 Feature: Search & Filter Routes
Handles querying and filtering emergency requests and available helpers.

Routes:
  GET    /api/emergency/all     - Get all emergency requests with filters
  GET    /api/emergency/my      - Get current user's emergency requests
  GET    /api/helper/available  - Get list of available helpers
"""

from datetime import datetime

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models import User, UserRole, EmergencyRequest, EmergencyType, EmergencyStatus

# ============================================================================
# Blueprint Definition
# ============================================================================

bp = Blueprint('member2_filter', __name__)


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _parse_enum(enum_cls, raw_value):
    """
    Parse an enum from user input using case-insensitive matching by value or name.
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


# ============================================================================
# ROUTE: GET /api/emergency/all
# ============================================================================

@bp.route('/api/emergency/all', methods=['GET'])
@jwt_required()
def get_all_emergency_requests():
    """
    Return all emergency requests with optional filtering.
    
    Query Parameters:
        - type: Filter by emergency type (blood, ambulance, oxygen)
        - status: Filter by status (pending, accepted, completed, cancelled)
        - date: Filter by creation date (YYYY-MM-DD format)
    
    Returns:
        JSON: {
            'requests': [ ...emergency_request_objects... ]
        }, 200
    
    Errors:
        400: Invalid filter parameters
        500: Database failure
    """
    query = EmergencyRequest.query
    
    # Optional filter: emergency type
    type_filter = request.args.get('type')
    if type_filter:
        emergency_type = _parse_enum(EmergencyType, type_filter)
        if not emergency_type:
            return jsonify({'error': 'Invalid type filter'}), 400
        query = query.filter(EmergencyRequest.emergency_type == emergency_type)
    
    # Optional filter: request status
    status_filter = request.args.get('status')
    if status_filter:
        status = _parse_enum(EmergencyStatus, status_filter)
        if not status:
            return jsonify({'error': 'Invalid status filter'}), 400
        query = query.filter(EmergencyRequest.status == status)
    
    # Optional filter: created_at date (YYYY-MM-DD)
    date_filter = request.args.get('date')
    if date_filter:
        try:
            target_date = datetime.strptime(date_filter, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
        
        query = query.filter(db.func.date(EmergencyRequest.created_at) == target_date)
    
    try:
        requests = query.order_by(EmergencyRequest.created_at.desc()).all()
    except Exception:
        return jsonify({'error': 'Failed to fetch emergency requests'}), 500
    
    return jsonify({'requests': [item.to_dict() for item in requests]}), 200


# ============================================================================
# ROUTE: GET /api/emergency/my
# ============================================================================

@bp.route('/api/emergency/my', methods=['GET'])
@jwt_required()
def get_my_emergency_requests():
    """
    Get current user's emergency requests.
    
    Behavior by role:
        - Requesters see: all requests they created
        - Helpers see: all requests assigned to them
    
    Returns:
        JSON: {
            'requests': [ ...emergency_request_objects... ]
        }, 200
    
    Errors:
        404: User not found
        403: Unsupported user role
        500: Database failure
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Branch query behavior by role
    if user.role == UserRole.REQUESTER:
        query = EmergencyRequest.query.filter(EmergencyRequest.requester_id == user.id)
    elif user.role == UserRole.HELPER:
        query = EmergencyRequest.query.filter(EmergencyRequest.helper_id == user.id)
    else:
        return jsonify({'error': 'Unsupported user role'}), 403
    
    try:
        requests = query.order_by(EmergencyRequest.created_at.desc()).all()
    except Exception:
        return jsonify({'error': 'Failed to fetch user emergency requests'}), 500
    
    return jsonify({'requests': [item.to_dict() for item in requests]}), 200


# ============================================================================
# ROUTE: GET /api/helper/available
# ============================================================================

@bp.route('/api/helper/available', methods=['GET'])
def list_available_helpers():
    """
    Public endpoint returning all currently available helpers.
    
    Returns:
        JSON: {
            'helpers': [
                {
                    'id': int,
                    'name': str,
                    'phone': str,
                    'blood_group': str or null,
                    'skills': list,
                    'latitude': null,
                    'longitude': null
                },
                ...
            ]
        }, 200
    
    Errors:
        500: Database failure
    """
    try:
        helpers = User.query.filter(
            User.role == UserRole.HELPER,
            User.is_available.is_(True),
        ).all()
    except Exception:
        return jsonify({'error': 'Failed to fetch available helpers'}), 500
    
    helper_list = []
    for helper in helpers:
        helper_list.append({
            'id': helper.id,
            'name': helper.name,
            'phone': helper.phone,
            'blood_group': helper.blood_group,
            'skills': helper.skills.split(',') if helper.skills else [],
            'latitude': None,
            'longitude': None,
        })
    
    return jsonify({'helpers': helper_list}), 200
