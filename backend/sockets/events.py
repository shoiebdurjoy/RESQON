"""
Socket Events
Defines all Flask-SocketIO real-time event handlers for room-based emergency chat.
"""

from flask import request
from flask_socketio import emit, join_room, leave_room

from extensions import db
from models import Message, User, EmergencyRequest


def register_events(socketio):
    """
    Register socket events on the provided Flask-SocketIO instance.

    Rooms are used so that chat and updates are scoped to one emergency request.
    This prevents users from receiving messages unrelated to the request they are viewing.
    """

    @socketio.on('connect')
    def handle_connect():
        """
        Event: connect
        Triggered when a client establishes a socket connection.
        """
        # Log the new connection for observability and debugging.
        print(f'Socket connected: sid={request.sid}')

    @socketio.on('disconnect')
    def handle_disconnect():
        """
        Event: disconnect
        Triggered when a client disconnects from the socket server.
        """
        # Log the disconnect event to trace socket lifecycle.
        print(f'Socket disconnected: sid={request.sid}')

    @socketio.on('join_room')
    def handle_join_room(data):
        """
        Event: join_room
        Payload: { request_id }

        Joins this socket connection to a room named request_<request_id>.
        """
        # Validate payload shape and required request_id.
        if not data or data.get('request_id') is None:
            emit('error', {'error': 'request_id is required'})
            return

        # Convert request_id to integer when possible for consistency.
        try:
            request_id = int(data.get('request_id'))
        except (TypeError, ValueError):
            emit('error', {'error': 'request_id must be an integer'})
            return

        # Build room name convention used across events.
        room = f'request_{request_id}'

        # Join the room so this socket receives only this request's messages.
        join_room(room)

        # Send confirmation back only to the sender that join succeeded.
        emit('joined', {
            'request_id': request_id,
            'room': room,
            'message': 'Joined request room successfully',
        })

    @socketio.on('send_message')
    def handle_send_message(data):
        """
        Event: send_message
        Payload: { request_id, sender_id, content }

        Stores the chat message in the database, then broadcasts it to all
        participants in room request_<request_id> as receive_message.
        """
        # Validate payload and required fields.
        if not data:
            emit('error', {'error': 'Payload is required'})
            return

        request_id = data.get('request_id')
        sender_id = data.get('sender_id')
        content = data.get('content')

        if request_id is None or sender_id is None or not content:
            emit('error', {'error': 'request_id, sender_id, and content are required'})
            return

        # Normalize IDs and content safely.
        try:
            request_id = int(request_id)
            sender_id = int(sender_id)
        except (TypeError, ValueError):
            emit('error', {'error': 'request_id and sender_id must be integers'})
            return

        content = str(content).strip()
        if not content:
            emit('error', {'error': 'content cannot be empty'})
            return

        # Resolve sender to include sender_name in outbound payload.
        sender = User.query.get(sender_id)
        if not sender:
            emit('error', {'error': 'Sender not found'})
            return

        # Only requester and assigned helper may send messages.
        emergency = EmergencyRequest.query.get(request_id)
        if not emergency:
            emit('error', {'error': 'Emergency request not found'})
            return
        if sender_id != emergency.requester_id and sender_id != emergency.helper_id:
            emit('error', {'error': 'Forbidden: not a participant in this request'})
            return

        # Create and persist message in database for durable chat history.
        message = Message(
            request_id=request_id,
            sender_id=sender_id,
            content=content,
        )

        try:
            db.session.add(message)
            db.session.commit()
        except Exception:
            db.session.rollback()
            emit('error', {'error': 'Failed to save message'})
            return

        # Build room name so message is scoped to this emergency request only.
        room = f'request_{request_id}'

        # Broadcast the saved message to everyone currently in the request room.
        emit('receive_message', {
            'id': message.id,
            'request_id': request_id,
            'sender_id': sender.id,
            'sender_name': sender.name,
            'content': message.content,
            'timestamp': message.timestamp.isoformat(),
        }, room=room)

    @socketio.on('leave_room')
    def handle_leave_room(data):
        """
        Event: leave_room
        Payload: { request_id }

        Removes this socket from room request_<request_id> so it no longer
        receives messages for that emergency request.
        """
        # Validate payload shape and required request_id.
        if not data or data.get('request_id') is None:
            emit('error', {'error': 'request_id is required'})
            return

        # Convert request_id to integer when possible for consistency.
        try:
            request_id = int(data.get('request_id'))
        except (TypeError, ValueError):
            emit('error', {'error': 'request_id must be an integer'})
            return

        # Leave the room so this socket stops receiving request-specific events.
        room = f'request_{request_id}'
        leave_room(room)
