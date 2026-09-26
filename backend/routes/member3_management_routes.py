"""
Member 3 Feature: Emergency Request Management Routes
Handles accepting, rejecting, completing, and canceling emergency requests.

Routes:
  GET    /api/emergency/<id>         - Get single emergency request
  PUT    /api/emergency/<id>/accept  - Helper accepts request
  PUT    /api/emergency/<id>/reject  - Helper rejects request
  PUT    /api/emergency/<id>/complete - Helper completes request
  PUT    /api/emergency/<id>/cancel  - Cancel request (dual-role behavior)
"""

import os
from datetime import datetime
from functools import wraps

from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from twilio.base.exceptions import TwilioRestException
from twilio.rest import Client

from extensions import db, socketio
from models import User, UserRole, EmergencyRequest, EmergencyStatus

# ============================================================================
# Blueprint Definition
# ============================================================================

bp = Blueprint('member3_management', __name__)


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

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


def helper_required(fn):
    """Decorator that requires JWT token and retrieves user."""
    @wraps(fn)
    @jwt_required()
    def wrapped(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        g.current_helper = user
        g.current_user = user
        return fn(*args, **kwargs)
    
    return wrapped


# ============================================================================
# ROUTE: GET /api/emergency/<request_id>
# ============================================================================

@bp.route('/api/emergency/<int:request_id>', methods=['GET'])
@jwt_required()
def get_single_emergency_request(request_id):
    """
    Return one emergency request by ID with full details.
    """
    try:
        emergency = EmergencyRequest.query.get(request_id)
    except Exception:
        return jsonify({'error': 'Failed to fetch emergency request'}), 500
    
    if not emergency:
        return jsonify({'error': 'Emergency request not found'}), 404
    
    return jsonify({'request': emergency.to_dict()}), 200


# ============================================================================
# ROUTE: PUT /api/emergency/<request_id>/accept
# ============================================================================

@bp.route('/api/emergency/<int:request_id>/accept', methods=['PUT'])
@helper_required
def accept_emergency_request(request_id):
    """
    Assign helper and mark request as ACCEPTED.
    
    Access: Any registered user (except the creator of this emergency)
    Preconditions: Request must be in PENDING status
    
    Returns:
        JSON: {
            'message': 'Emergency request accepted successfully',
            'request': { ...updated_emergency_data... }
        }, 200
    """
    helper = g.current_helper
    
    emergency = EmergencyRequest.query.get(request_id)
    if not emergency:
        return jsonify({'error': 'Emergency request not found'}), 404
    
    if emergency.status != EmergencyStatus.PENDING:
        return jsonify({'error': 'Only pending requests can be accepted'}), 400
    
    if emergency.requester_id == helper.id:
        return jsonify({'error': 'You cannot accept your own emergency request'}), 400
    
    emergency.helper_id = helper.id
    emergency.status = EmergencyStatus.ACCEPTED
    emergency.accepted_at = datetime.utcnow()
    
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Failed to accept emergency request'}), 500
    
    # Emit status update
    socketio.emit('request_status_updated', {
        'request_id': emergency.id,
        'status': emergency.status.value,
        'helper_id': helper.id,
    })
    
    # Send SMS notification
    requester = emergency.requester
    _send_sms(
        requester.phone if requester else None,
        f'Your {emergency.emergency_type.value} request has been accepted by {helper.name}.',
    )
    
    return jsonify({
        'message': 'Emergency request accepted successfully',
        'request': emergency.to_dict(),
    }), 200


# ============================================================================
# ROUTE: PUT /api/emergency/<request_id>/reject
# ============================================================================

@bp.route('/api/emergency/<int:request_id>/reject', methods=['PUT'])
@helper_required
def reject_emergency_request(request_id):
    """
    Reject request while keeping it in PENDING state.
    
    Access: Helper only
    Preconditions: Request must be in PENDING status
    
    Returns:
        JSON: {
            'message': 'Emergency request rejected. Request remains pending for other helpers.',
            'request_id': int,
            'status': str
        }, 200
    """
    emergency = EmergencyRequest.query.get(request_id)
    if not emergency:
        return jsonify({'error': 'Emergency request not found'}), 404
    
    if emergency.status != EmergencyStatus.PENDING:
        return jsonify({'error': 'Only pending requests can be rejected'}), 400
    
    return jsonify({
        'message': 'Emergency request rejected. Request remains pending for other helpers.',
        'request_id': emergency.id,
        'status': emergency.status.value,
    }), 200


# ============================================================================
# ROUTE: PUT /api/emergency/<request_id>/complete
# ============================================================================

@bp.route('/api/emergency/<int:request_id>/complete', methods=['PUT'])
@helper_required
def complete_emergency_request(request_id):
    """
    Mark active request as COMPLETED by assigned helper or original requester.
    
    Access: Assigned helper or requester
    Preconditions: Request must be in ACCEPTED or PENDING status
    
    Returns:
        JSON: {
            'message': 'Emergency request completed successfully',
            'request': { ...updated_emergency_data... }
        }, 200
    """
    user = g.current_helper
    
    emergency = EmergencyRequest.query.get(request_id)
    if not emergency:
        return jsonify({'error': 'Emergency request not found'}), 404
    
    if emergency.helper_id != user.id and emergency.requester_id != user.id:
        return jsonify({'error': 'Forbidden: only requester or assigned helper can complete this request'}), 403
    
    if emergency.status not in (EmergencyStatus.ACCEPTED, EmergencyStatus.PENDING):
        return jsonify({'error': 'Only active requests can be completed'}), 400
    
    data = request.get_json(silent=True) or {}
    resolution_note = str(data.get('resolution_note', '')).strip() if data else ''

    emergency.status = EmergencyStatus.COMPLETED
    emergency.completed_at = datetime.utcnow()
    
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Failed to complete emergency request'}), 500
    
    # Emit status update
    socketio.emit('request_status_updated', {
        'request_id': emergency.id,
        'status': emergency.status.value,
        'helper_id': emergency.helper_id,
        'resolution_note': resolution_note or None,
    })
    
    # Send SMS notification
    requester = emergency.requester
    _send_sms(
        requester.phone if requester else None,
        'Your emergency request has been completed.',
    )
    
    resp_dict = emergency.to_dict()
    if resolution_note:
        resp_dict['resolution_note'] = resolution_note

    return jsonify({
        'message': 'Emergency request completed successfully',
        'request': resp_dict,
    }), 200


# ============================================================================
# ROUTE: PUT /api/emergency/<request_id>/cancel
# ============================================================================

@bp.route('/api/emergency/<int:request_id>/cancel', methods=['PUT'])
@jwt_required()
def cancel_emergency_request(request_id):
    """
    Cancel behavior:
    - Creator: cancel own non-completed request (status -> CANCELLED)
    - Assigned Helper: cancel accepted assignment (status -> PENDING, helper_id -> NULL)
    
    Returns:
        JSON: {
            'message': str,
            'request': { ...updated_emergency_data... }
        }, 200
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    emergency = EmergencyRequest.query.get(request_id)
    if not emergency:
        return jsonify({'error': 'Emergency request not found'}), 404
    
    if emergency.requester_id == user.id:
        # Requester can cancel their own requests
        if emergency.status in (EmergencyStatus.COMPLETED, EmergencyStatus.CANCELLED):
            return jsonify({'error': 'Request cannot be cancelled in its current status'}), 400
        
        emergency.status = EmergencyStatus.CANCELLED
        message = 'Emergency request cancelled successfully'
    
    elif emergency.helper_id == user.id:
        # Helper can cancel accepted assignment
        if emergency.status != EmergencyStatus.ACCEPTED:
            return jsonify({'error': 'Only accepted requests can be cancelled by helper'}), 400
        
        emergency.status = EmergencyStatus.PENDING
        emergency.helper_id = None
        emergency.accepted_at = None
        message = 'Assignment cancelled successfully. Request is pending for other helpers.'
    
    else:
        return jsonify({'error': 'Forbidden: you are not a participant in this request'}), 403
    
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Failed to cancel emergency request'}), 500
    
    # Emit status update
    socketio.emit('request_status_updated', {
        'request_id': emergency.id,
        'status': emergency.status.value,
        'helper_id': emergency.helper_id,
    })
    
    return jsonify({
        'message': message,
        'request': emergency.to_dict(),
    }), 200
