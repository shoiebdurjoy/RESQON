"""
Helper Routes Blueprint
Handles helper-specific actions with role-based access control.
"""

from functools import wraps

from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db, socketio
from models import User, UserRole


# Create helper blueprint. App-level registration adds '/api', so final routes
# become '/api/helper/...'.
bp = Blueprint('helper', __name__, url_prefix='/helper')


def helper_required(fn):
    """
    Custom decorator to protect helper-only endpoints.

    This decorator does two checks:
    1. Ensures the JWT token is valid via @jwt_required().
    2. Ensures the authenticated user has role == 'helper'.
    """
    @wraps(fn)
    @jwt_required()
    def decorated(*args, **kwargs):
        # Extract the current user ID from the validated JWT token.
        user_id = get_jwt_identity()

        # Look up the authenticated user in the database.
        user = User.query.get(user_id)

        # If the token points to a user that no longer exists, return 404.
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Enforce helper-only access.
        if user.role != UserRole.HELPER:
            return jsonify({'error': 'Forbidden: helper role required'}), 403

        # Store the helper object in flask.g to avoid repeated queries inside route handlers.
        g.current_helper = user

        # Continue execution of the wrapped route function.
        return fn(*args, **kwargs)

    return decorated


@bp.route('/profile', methods=['GET'])
@helper_required
def get_helper_profile():
    """
    GET /api/helper/profile
    Return the currently logged-in helper's full profile.
    """
    # Retrieve helper object set by @helper_required.
    helper = g.current_helper

    # Return helper profile as JSON.
    return jsonify({'helper': helper.to_dict()}), 200


@bp.route('/profile', methods=['PUT'])
@helper_required
def update_helper_profile():
    """
    PUT /api/helper/profile
    Update helper profile fields: name, phone, blood_group, skills.
    """
    # Parse JSON payload from the request body.
    data = request.get_json()

    # Reject non-JSON or empty payloads.
    if not data:
        return jsonify({'error': 'Request body must be JSON'}), 400

    # Access current helper from request context.
    helper = g.current_helper

    # Define allowed profile fields for update.
    allowed_fields = {'name', 'phone', 'blood_group', 'skills'}

    # Validate that payload contains only supported fields.
    unexpected_fields = [key for key in data.keys() if key not in allowed_fields]
    if unexpected_fields:
        return jsonify({'error': f'Unexpected fields: {", ".join(unexpected_fields)}'}), 400

    # Update 'name' when provided and non-empty after trimming.
    if 'name' in data:
        name = str(data.get('name', '')).strip()
        if not name:
            return jsonify({'error': 'Name cannot be empty'}), 400
        helper.name = name

    # Update 'phone' when provided and non-empty after trimming.
    if 'phone' in data:
        phone = str(data.get('phone', '')).strip()
        if not phone:
            return jsonify({'error': 'Phone cannot be empty'}), 400
        helper.phone = phone

    # Update optional blood group (allow null/empty to clear value).
    if 'blood_group' in data:
        blood_group = data.get('blood_group')
        helper.blood_group = str(blood_group).strip() if blood_group else None

    # Update skills with flexible input handling:
    # - If list is provided, store as comma-separated text (matching current model design).
    # - If string is provided, store as-is after trimming.
    # - If null provided, clear skills.
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
        # Persist profile updates to the database.
        db.session.commit()
    except Exception:
        # Roll back transaction to keep DB consistent after any write failure.
        db.session.rollback()
        return jsonify({'error': 'Failed to update helper profile'}), 500

    # Return updated helper profile.
    return jsonify({
        'message': 'Helper profile updated successfully',
        'helper': helper.to_dict(),
    }), 200


@bp.route('/toggle-availability', methods=['PUT'])
@helper_required
def toggle_helper_availability():
    """
    PUT /api/helper/toggle-availability
    Toggle helper's is_available status and emit SocketIO update event.
    """
    # Access current helper from request context.
    helper = g.current_helper

    # Toggle availability flag (True -> False, False -> True).
    helper.is_available = not helper.is_available

    try:
        # Save the toggled availability to the database.
        db.session.commit()
    except Exception:
        # Roll back in case of DB write failure.
        db.session.rollback()
        return jsonify({'error': 'Failed to update helper availability'}), 500

    # Emit real-time event so connected clients can refresh helper availability.
    socketio.emit('helper_availability_updated', {
        'helper_id': helper.id,
        'is_available': helper.is_available,
    })

    # Return updated status to caller.
    return jsonify({
        'message': 'Helper availability updated successfully',
        'helper_id': helper.id,
        'is_available': helper.is_available,
    }), 200


@bp.route('/available', methods=['GET'])
def list_available_helpers():
    """
    GET /api/helper/available
    Public endpoint returning all currently available helpers.
    """
    try:
        # Query all users with helper role and availability set to true.
        helpers = User.query.filter(
            User.role == UserRole.HELPER,
            User.is_available.is_(True),
        ).all()
    except Exception:
        # Return consistent JSON error shape on query failure.
        return jsonify({'error': 'Failed to fetch available helpers'}), 500

    # Build response objects with requested fields.
    # Note: latitude/longitude do not currently exist on User model,
    # so we return them as null placeholders to keep API contract stable.
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

    # Return public list of available helpers.
    return jsonify({'helpers': helper_list}), 200
