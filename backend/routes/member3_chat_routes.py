"""
Member 3 Feature: Chat System Routes
Handles real-time chat communication during emergencies via HTTP REST endpoints.
WebSocket events are handled separately in sockets/events.py

Routes:
  POST   /api/chat/send  - Send a message (alternative to WebSocket)
  GET    /api/chat/<request_id>/history - Get chat history for a request
"""

from datetime import datetime

from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db, socketio
from models import User, Message, EmergencyRequest

# ============================================================================
# Blueprint Definition
# ============================================================================

bp = Blueprint('member3_chat', __name__)


# ============================================================================
# ROUTE: POST /api/chat/send
# ============================================================================

@bp.route('/api/chat/send', methods=['POST'])
@jwt_required()
def send_chat_message():
    """
    Send a chat message via HTTP (alternative to WebSocket).
    
    Request Body (JSON):
        - request_id (int, required): Emergency request ID
        - content (str, required): Message content
    
    Returns:
        JSON: {
            'message': 'Message sent successfully',
            'data': { ...message_data... }
        }, 201
    
    Errors:
        400: Missing required fields or invalid data
        404: Request or user not found
        500: Database failure
    """
    sender_id = get_jwt_identity()
    sender = User.query.get(sender_id)
    
    if not sender:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body must be JSON'}), 400
    
    request_id = data.get('request_id')
    content = data.get('content', '').strip()
    
    if not request_id or not content:
        return jsonify({'error': 'Missing required fields: request_id, content'}), 400
    
    # Verify emergency request exists
    emergency = EmergencyRequest.query.get(request_id)
    if not emergency:
        return jsonify({'error': 'Emergency request not found'}), 404
    
    # Verify sender is either requester or assigned helper
    if sender.id != emergency.requester_id and sender.id != emergency.helper_id:
        return jsonify({'error': 'Forbidden: not participant in this request'}), 403
    
    try:
        # Create and save message
        msg = Message(
            request_id=request_id,
            sender_id=sender_id,
            content=content
        )
        db.session.add(msg)
        db.session.commit()
        
        # Emit real-time socket event for connected clients
        socketio.emit('receive_message', {
            'id': msg.id,
            'request_id': msg.request_id,
            'sender_id': msg.sender_id,
            'sender_name': sender.name,
            'content': msg.content,
            'timestamp': msg.timestamp.isoformat(),
        })
        
        return jsonify({
            'message': 'Message sent successfully',
            'data': {
                'id': msg.id,
                'request_id': msg.request_id,
                'sender_id': msg.sender_id,
                'sender_name': sender.name,
                'content': msg.content,
                'timestamp': msg.timestamp.isoformat(),
            }
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to send message', 'details': str(e)}), 500


# ============================================================================
# ROUTE: GET /api/chat/<request_id>/history
# ============================================================================

@bp.route('/api/chat/<int:request_id>/history', methods=['GET'])
@jwt_required()
def get_chat_history(request_id):
    """
    Get chat message history for a specific emergency request.
    
    Authorization: User must be requester or assigned helper
    
    Returns:
        JSON: {
            'messages': [
                {
                    'id': int,
                    'request_id': int,
                    'sender_id': int,
                    'sender_name': str,
                    'content': str,
                    'timestamp': str (ISO 8601)
                },
                ...
            ]
        }, 200
    
    Errors:
        403: User not participant in this request
        404: Request not found
        500: Database failure
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Verify request exists
    emergency = EmergencyRequest.query.get(request_id)
    if not emergency:
        return jsonify({'error': 'Emergency request not found'}), 404
    
    # Verify user is requester or helper
    if user.id != emergency.requester_id and user.id != emergency.helper_id:
        return jsonify({'error': 'Forbidden: not participant in this request'}), 403
    
    try:
        # Fetch all messages for this request in chronological order
        messages = (
            Message.query
            .filter(Message.request_id == request_id)
            .order_by(Message.timestamp.asc())
            .all()
        )
        
        # Build response
        message_list = []
        for msg in messages:
            message_list.append({
                'id': msg.id,
                'request_id': msg.request_id,
                'sender_id': msg.sender_id,
                'sender_name': msg.sender.name if msg.sender else 'Unknown',
                'content': msg.content,
                'timestamp': msg.timestamp.isoformat(),
            })
        
        return jsonify({'messages': message_list}), 200
    
    except Exception:
        return jsonify({'error': 'Failed to fetch chat history'}), 500
