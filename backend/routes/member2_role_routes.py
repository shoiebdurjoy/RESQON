"""
Member 2 Feature: Role-Based Access & Availability Control Routes
Handles helper profile management and availability toggling with role-based access.

Routes:
  GET    /api/helper/profile     - Get current helper's profile [Helper Only]
  PUT    /api/helper/profile     - Update helper profile fields [Helper Only]
  PUT    /api/helper/toggle-availability - Toggle helper availability [Helper Only]
"""

from functools import wraps

from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db, socketio
from models import User, UserRole

# ============================================================================
# Blueprint Definition
# ============================================================================

bp = Blueprint('member2_role', __name__)


# ============================================================================
# ROLE-BASED ACCESS DECORATORS
# ============================================================================

def helper_required(fn):
    """
    Decorator that requires JWT token and helper role.
    Stores current helper in g for downstream handlers.
    """
    @wraps(fn)
    @jwt_required()
    def decorated(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if user.role != UserRole.HELPER:
            return jsonify({'error': 'Forbidden: helper role required'}), 403
        
        g.current_helper = user
        return fn(*args, **kwargs)
    
    return decorated


def requester_required(fn):
    """
    Decorator that requires JWT token and requester role.
    Stores current requester in g for downstream handlers.
    """
    @wraps(fn)
    @jwt_required()
    def decorated(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if user.role != UserRole.REQUESTER:
            return jsonify({'error': 'Forbidden: requester role required'}), 403
        
        g.current_requester = user
        return fn(*args, **kwargs)
    
    return decorated


# ============================================================================
# ROUTE: GET /api/helper/profile
# ============================================================================

@bp.route('/api/helper/profile', methods=['GET'])
@helper_required
def get_helper_profile():
    """
    Return the currently logged-in helper's full profile.
    """
    helper = g.current_helper
    return jsonify({'helper': helper.to_dict()}), 200


# ============================================================================
# ROUTE: PUT /api/helper/profile
# ============================================================================

@bp.route('/api/helper/profile', methods=['PUT'])
@helper_required
def update_helper_profile():
    """
    Update helper profile fields: name, phone, blood_group, skills.
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Request body must be JSON'}), 400
    
    helper = g.current_helper
    allowed_fields = {'name', 'phone', 'blood_group', 'skills'}
    
    # Validate no unexpected fields
    unexpected_fields = [key for key in data.keys() if key not in allowed_fields]
    if unexpected_fields:
        return jsonify({'error': f'Unexpected fields: {", ".join(unexpected_fields)}'}), 400
    
    # Update 'name' field
    if 'name' in data:
        name = str(data.get('name', '')).strip()
        if not name:
            return jsonify({'error': 'Name cannot be empty'}), 400
        helper.name = name
    
    # Update 'phone' field
    if 'phone' in data:
        phone = str(data.get('phone', '')).strip()
        if not phone:
            return jsonify({'error': 'Phone cannot be empty'}), 400
        helper.phone = phone
    
    # Update 'blood_group' field (optional)
    if 'blood_group' in data:
        blood_group = data.get('blood_group')
        helper.blood_group = str(blood_group).strip() if blood_group else None
    
    # Update 'skills' field (flexible input handling)
    if 'skills' in data:
        skills = data.get('skills')
        if skills is None:
            helper.skills = None
        elif isinstance(skills, list):
            helper.skills = ','.join([str(item).strip() for item in skills if str(item).strip()])
        elif isinstance(skills, str):
            helper.skills = skills.strip() or None
        else:
            return jsonify({'error': 'Skills must be a list, string, or null'}), 400
    
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Failed to update helper profile'}), 500
    
    return jsonify({
        'message': 'Helper profile updated successfully',
        'helper': helper.to_dict(),
    }), 200


# ============================================================================
# ROUTE: PUT /api/helper/toggle-availability
# ============================================================================

@bp.route('/api/helper/toggle-availability', methods=['PUT'])
@helper_required
def toggle_helper_availability():
    """
    Toggle helper's is_available status.
    Emits SocketIO update event for real-time refresh.
    """
    helper = g.current_helper
    
    # Toggle availability flag
    helper.is_available = not helper.is_available
    
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Failed to update helper availability'}), 500
    
    # Emit real-time event
    socketio.emit('helper_availability_updated', {
        'helper_id': helper.id,
        'is_available': helper.is_available,
    })
    
    return jsonify({
        'message': 'Helper availability updated successfully',
        'helper_id': helper.id,
        'is_available': helper.is_available,
    }), 200
