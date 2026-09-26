"""
Emergency Routes Blueprint
Handles emergency request management for requesters and helpers.
"""

import os
from datetime import datetime
from functools import wraps

from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from twilio.base.exceptions import TwilioRestException
from twilio.rest import Client

from extensions import db, socketio
from models import (
    User,
    UserRole,
    EmergencyRequest,
    EmergencyType,
    UrgencyLevel,
    EmergencyStatus,
)


# Create blueprint. App-level registration adds '/api', producing '/api/emergency/...'.
bp = Blueprint('emergency', __name__, url_prefix='/emergency')


def _parse_enum(enum_cls, raw_value):
    """
    Parse an enum from user input using case-insensitive matching by value or name.

    Example accepted inputs for EmergencyType.BLOOD:
    - "blood"
    - "Blood"
    - "BLOOD"
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
    # Load Twilio config from environment variables.
    account_sid = os.getenv('TWILIO_ACCOUNT_SID')
    auth_token = os.getenv('TWILIO_AUTH_TOKEN')
    from_phone = os.getenv('TWILIO_PHONE_NUMBER')

    # If Twilio env vars are missing or destination number absent, skip silently.
    if not account_sid or not auth_token or not from_phone or not to_phone:
        return

    try:
        # Initialize Twilio client and send the message.
        client = Client(account_sid, auth_token)
        client.messages.create(
            body=body,
            from_=from_phone,
            to=to_phone,
        )
    except (TwilioRestException, Exception):
        # Intentionally ignore SMS failures to keep API stable.
        pass


def requester_required(fn):
    """
    Decorator that requires a valid JWT token and requester role.
    """
    @wraps(fn)
    @jwt_required()
    def wrapped(*args, **kwargs):
        # Resolve the authenticated user from JWT identity.
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        # Return JSON error if user no longer exists.
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Enforce requester-only role access.
        if user.role != UserRole.REQUESTER:
            return jsonify({'error': 'Forbidden: requester role required'}), 403

        # Save current requester on flask.g for downstream route handlers.
        g.current_requester = user
        return fn(*args, **kwargs)

    return wrapped


def helper_required(fn):
    """
    Decorator that requires a valid JWT token and helper role.
    """
    @wraps(fn)
    @jwt_required()
    def wrapped(*args, **kwargs):
        # Resolve the authenticated user from JWT identity.
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        # Return JSON error if user no longer exists.
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Enforce helper-only role access.
        if user.role != UserRole.HELPER:
            return jsonify({'error': 'Forbidden: helper role required'}), 403

        # Save current helper on flask.g for downstream route handlers.
        g.current_helper = user
        return fn(*args, **kwargs)

    return wrapped


@bp.route('/create', methods=['POST'])
@requester_required
def create_emergency_request():
    """
    POST /api/emergency/create
    Create a new emergency request as requester.
    """
    # Parse request body as JSON.
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body must be JSON'}), 400

    # Validate required fields are present and not empty.
    required_fields = ['emergency_type', 'description', 'urgency_level', 'latitude', 'longitude']
    missing = [field for field in required_fields if data.get(field) in (None, '')]
    if missing:
        return jsonify({'error': f"Missing required fields: {', '.join(missing)}"}), 400

    # Parse emergency type enum from flexible user input.
    emergency_type = _parse_enum(EmergencyType, data.get('emergency_type'))
    if not emergency_type:
        return jsonify({'error': 'Invalid emergency_type'}), 400

    # Parse urgency level enum from flexible user input.
    urgency_level = _parse_enum(UrgencyLevel, data.get('urgency_level'))
    if not urgency_level:
        return jsonify({'error': 'Invalid urgency_level'}), 400

    # Validate and coerce location coordinates.
    try:
        latitude = float(data.get('latitude'))
        longitude = float(data.get('longitude'))
    except (TypeError, ValueError):
        return jsonify({'error': 'latitude and longitude must be numeric'}), 400

    # Build EmergencyRequest object with initial PENDING status.
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
        # Persist the new emergency request.
        db.session.add(emergency)
        db.session.commit()
    except Exception:
        # Keep DB consistent on write failure.
        db.session.rollback()
        return jsonify({'error': 'Failed to create emergency request'}), 500

    # Broadcast the new emergency request to all connected clients.
    socketio.emit('new_emergency_request', {
        'request': emergency.to_dict(),
    })

    # Return created request payload.
    return jsonify({
        'message': 'Emergency request created successfully',
        'request': emergency.to_dict(),
    }), 201


@bp.route('/all', methods=['GET'])
@jwt_required()
def get_all_emergency_requests():
    """
    GET /api/emergency/all
    Return all emergency requests with optional filtering.
    Supported filters:
    - ?type=Blood
    - ?status=Pending
    - ?date=2025-01-15
    """
    # Start from full emergency request query.
    query = EmergencyRequest.query

    # Optional filter: emergency type.
    type_filter = request.args.get('type')
    if type_filter:
        emergency_type = _parse_enum(EmergencyType, type_filter)
        if not emergency_type:
            return jsonify({'error': 'Invalid type filter'}), 400
        query = query.filter(EmergencyRequest.emergency_type == emergency_type)

    # Optional filter: request status.
    status_filter = request.args.get('status')
    if status_filter:
        status = _parse_enum(EmergencyStatus, status_filter)
        if not status:
            return jsonify({'error': 'Invalid status filter'}), 400
        query = query.filter(EmergencyRequest.status == status)

    # Optional filter: created_at calendar date (YYYY-MM-DD).
    date_filter = request.args.get('date')
    if date_filter:
        try:
            target_date = datetime.strptime(date_filter, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

        query = query.filter(db.func.date(EmergencyRequest.created_at) == target_date)

    try:
        # Sort newest first, as requested.
        requests = query.order_by(EmergencyRequest.created_at.desc()).all()
    except Exception:
        return jsonify({'error': 'Failed to fetch emergency requests'}), 500

    # Return serialized list.
    return jsonify({'requests': [item.to_dict() for item in requests]}), 200


@bp.route('/my', methods=['GET'])
@jwt_required()
def get_my_emergency_requests():
    """
    GET /api/emergency/my
    - Requesters see requests they created.
    - Helpers see requests assigned to them.
    """
    # Resolve authenticated user from token.
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Branch query behavior by role.
    if user.role == UserRole.REQUESTER:
        query = EmergencyRequest.query.filter(EmergencyRequest.requester_id == user.id)
    elif user.role == UserRole.HELPER:
        query = EmergencyRequest.query.filter(EmergencyRequest.helper_id == user.id)
    else:
        return jsonify({'error': 'Unsupported user role'}), 403

    try:
        # Sort by most recently created request first.
        requests = query.order_by(EmergencyRequest.created_at.desc()).all()
    except Exception:
        return jsonify({'error': 'Failed to fetch user emergency requests'}), 500

    # Return serialized list for current user.
    return jsonify({'requests': [item.to_dict() for item in requests]}), 200


@bp.route('/<int:request_id>', methods=['GET'])
@jwt_required()
def get_single_emergency_request(request_id):
    """
    GET /api/emergency/<id>
    Return one emergency request by ID with full details.
    """
    try:
        # Fetch request by primary key.
        emergency = EmergencyRequest.query.get(request_id)
    except Exception:
        return jsonify({'error': 'Failed to fetch emergency request'}), 500

    if not emergency:
        return jsonify({'error': 'Emergency request not found'}), 404

    # Return complete serialized request.
    return jsonify({'request': emergency.to_dict()}), 200


@bp.route('/<int:request_id>/accept', methods=['PUT'])
@helper_required
def accept_emergency_request(request_id):
    """
    PUT /api/emergency/<id>/accept
    Assign helper and mark request as ACCEPTED.
    """
    helper = g.current_helper

    # Find emergency request to accept.
    emergency = EmergencyRequest.query.get(request_id)
    if not emergency:
        return jsonify({'error': 'Emergency request not found'}), 404

    # Only pending requests can be accepted.
    if emergency.status != EmergencyStatus.PENDING:
        return jsonify({'error': 'Only pending requests can be accepted'}), 400

    # Assign the current helper and transition status.
    emergency.helper_id = helper.id
    emergency.status = EmergencyStatus.ACCEPTED
    emergency.accepted_at = datetime.utcnow()

    try:
        # Persist acceptance in DB.
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Failed to accept emergency request'}), 500

    # Emit status update to connected clients.
    socketio.emit('request_status_updated', {
        'request_id': emergency.id,
        'status': emergency.status.value,
        'helper_id': helper.id,
    })

    # Notify requester by SMS; never fail API if SMS sending fails.
    requester = emergency.requester
    _send_sms(
        requester.phone if requester else None,
        f'Your {emergency.emergency_type.value} request has been accepted by {helper.name}.',
    )

    # Return updated request payload.
    return jsonify({
        'message': 'Emergency request accepted successfully',
        'request': emergency.to_dict(),
    }), 200


@bp.route('/<int:request_id>/reject', methods=['PUT'])
@helper_required
def reject_emergency_request(request_id):
    """
    PUT /api/emergency/<id>/reject
    Reject request only when current status is PENDING.
    No status transition is performed.
    """
    # Find request being rejected.
    emergency = EmergencyRequest.query.get(request_id)
    if not emergency:
        return jsonify({'error': 'Emergency request not found'}), 404

    # Reject is only valid while request is still pending.
    if emergency.status != EmergencyStatus.PENDING:
        return jsonify({'error': 'Only pending requests can be rejected'}), 400

    # Return confirmation without changing status.
    return jsonify({
        'message': 'Emergency request rejected. Request remains pending for other helpers.',
        'request_id': emergency.id,
        'status': emergency.status.value,
    }), 200


@bp.route('/<int:request_id>/complete', methods=['PUT'])
@helper_required
def complete_emergency_request(request_id):
    """
    PUT /api/emergency/<id>/complete
    Mark accepted request as COMPLETED by assigned helper.
    """
    helper = g.current_helper

    # Find emergency request to complete.
    emergency = EmergencyRequest.query.get(request_id)
    if not emergency:
        return jsonify({'error': 'Emergency request not found'}), 404

    # Only assigned helper may complete the request.
    if emergency.helper_id != helper.id:
        return jsonify({'error': 'Forbidden: request is not assigned to you'}), 403

    # Only accepted requests can transition to completed.
    if emergency.status != EmergencyStatus.ACCEPTED:
        return jsonify({'error': 'Only accepted requests can be completed'}), 400

    # Transition request state to completed and set completion timestamp.
    emergency.status = EmergencyStatus.COMPLETED
    emergency.completed_at = datetime.utcnow()

    try:
        # Persist completion in DB.
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Failed to complete emergency request'}), 500

    # Emit status update event for real-time consumers.
    socketio.emit('request_status_updated', {
        'request_id': emergency.id,
        'status': emergency.status.value,
        'helper_id': helper.id,
    })

    # Notify requester by SMS; failures are intentionally ignored.
    requester = emergency.requester
    _send_sms(
        requester.phone if requester else None,
        'Your request has been completed.',
    )

    # Return updated request object.
    return jsonify({
        'message': 'Emergency request completed successfully',
        'request': emergency.to_dict(),
    }), 200


@bp.route('/<int:request_id>/cancel', methods=['PUT'])
@jwt_required()
def cancel_emergency_request(request_id):
    """
    PUT /api/emergency/<id>/cancel
    Cancel behavior by role:
    - Requester: cancel own non-completed request (status -> CANCELLED)
    - Assigned helper on ACCEPTED request: cancel assignment (status -> PENDING)
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Find emergency request to cancel.
    emergency = EmergencyRequest.query.get(request_id)
    if not emergency:
        return jsonify({'error': 'Emergency request not found'}), 404

    if user.role == UserRole.REQUESTER:
        # Ensure only creator requester can cancel this request.
        if emergency.requester_id != user.id:
            return jsonify({'error': 'Forbidden: you can only cancel your own request'}), 403

        # Do not allow canceling already completed/cancelled requests.
        if emergency.status in (EmergencyStatus.COMPLETED, EmergencyStatus.CANCELLED):
            return jsonify({'error': 'Request cannot be cancelled in its current status'}), 400

        # Transition request status to cancelled.
        emergency.status = EmergencyStatus.CANCELLED

    elif user.role == UserRole.HELPER:
        # Helper can only cancel assignment if this request is assigned to them.
        if emergency.helper_id != user.id:
            return jsonify({'error': 'Forbidden: request is not assigned to you'}), 403

        # Helper can only cancel assignment when request is in accepted state.
        if emergency.status != EmergencyStatus.ACCEPTED:
            return jsonify({'error': 'Only accepted requests can be cancelled by helper'}), 400

        # Return request to pending pool for other helpers.
        emergency.status = EmergencyStatus.PENDING
        emergency.helper_id = None
        emergency.accepted_at = None

    else:
        return jsonify({'error': 'Unsupported user role'}), 403

    try:
        # Persist cancellation state.
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Failed to cancel emergency request'}), 500

    # Emit real-time status update event.
    socketio.emit('request_status_updated', {
        'request_id': emergency.id,
        'status': emergency.status.value,
        'helper_id': emergency.helper_id,
    })

    # Return updated request payload.
    if user.role == UserRole.HELPER:
        message = 'Assignment cancelled successfully. Request is pending for other helpers.'
    else:
        message = 'Emergency request cancelled successfully'

    return jsonify({'message': message, 'request': emergency.to_dict()}), 200
