"""
Notification Routes
Provides chat retrieval and per-user emergency history timeline.
"""

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_

from models import Message, EmergencyRequest


# App-level registration adds '/api', so this becomes '/api/notification/...'.
bp = Blueprint('notification', __name__, url_prefix='/notification')


@bp.route('/messages/<int:request_id>', methods=['GET'])
@jwt_required()
def get_messages(request_id):
    """
    GET /api/notification/messages/<request_id>
    Returns all messages for the given emergency request in ascending time order.
    """
    try:
        # Query request messages oldest-first so chat renders in natural order.
        messages = (
            Message.query
            .filter(Message.request_id == request_id)
            .order_by(Message.timestamp.asc())
            .all()
        )
    except Exception:
        return jsonify({'error': 'Failed to fetch messages'}), 500

    # Build response including sender name from related User model.
    payload = []
    for msg in messages:
        payload.append({
            'id': msg.id,
            'request_id': msg.request_id,
            'sender_id': msg.sender_id,
            'sender_name': msg.sender.name if msg.sender else None,
            'content': msg.content,
            'timestamp': msg.timestamp.isoformat(),
        })

    return jsonify({'messages': payload}), 200


@bp.route('/history', methods=['GET'])
@jwt_required()
def get_history():
    """
    GET /api/notification/history
    Returns all emergency requests involving the current user (requester or helper),
    each with its messages and status timeline.
    """
    # Resolve current user ID from JWT token.
    user_id = get_jwt_identity()

    try:
        # Fetch requests where user is requester OR assigned helper.
        requests = (
            EmergencyRequest.query
            .filter(
                or_(
                    EmergencyRequest.requester_id == user_id,
                    EmergencyRequest.helper_id == user_id,
                )
            )
            .order_by(EmergencyRequest.created_at.desc())
            .all()
        )
    except Exception:
        return jsonify({'error': 'Failed to fetch emergency history'}), 500

    history = []
    for req in requests:
        # Load messages for this request in chronological order.
        req_messages = (
            Message.query
            .filter(Message.request_id == req.id)
            .order_by(Message.timestamp.asc())
            .all()
        )

        # Serialize messages with sender names for UI-friendly display.
        serialized_messages = []
        for msg in req_messages:
            serialized_messages.append({
                'id': msg.id,
                'sender_id': msg.sender_id,
                'sender_name': msg.sender.name if msg.sender else None,
                'content': msg.content,
                'timestamp': msg.timestamp.isoformat(),
            })

        # Build status timeline from request lifecycle timestamps.
        status_timeline = {
            'created_at': req.created_at.isoformat() if req.created_at else None,
            'accepted_at': req.accepted_at.isoformat() if req.accepted_at else None,
            'completed_at': req.completed_at.isoformat() if req.completed_at else None,
        }

        # Append full request history entry.
        history.append({
            'request': req.to_dict(),
            'messages': serialized_messages,
            'status_timeline': status_timeline,
        })

    return jsonify({'history': history}), 200
