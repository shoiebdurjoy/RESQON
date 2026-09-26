# Member 3: Request Management & Real-Time Chat

## Overview
Member 3 is responsible for emergency request lifecycle management (accept/reject/complete/cancel) and implementing real-time chat communication between requesters and helpers.

## Backend Responsibilities

### Files
- `backend/routes/member3_management_routes.py` - Emergency request state transitions
- `backend/routes/member3_chat_routes.py` - Chat messaging endpoints
- `backend/sockets/events.py` - WebSocket events for real-time chat (shared infrastructure)

### API Endpoints

#### Request Management (`member3_management_routes.py`)
- `GET /api/emergency/<id>` - Get single request details
- `PUT /api/emergency/<id>/accept` - Helper accepts request (helper only)
- `PUT /api/emergency/<id>/reject` - Helper rejects request (helper only)
- `PUT /api/emergency/<id>/complete` - Helper completes request (helper only)
- `PUT /api/emergency/<id>/cancel` - Dual-role cancel:
  - Requester: mark as CANCELLED
  - Helper: revert to PENDING (reassign pool)

#### Chat (`member3_chat_routes.py`)
- `POST /api/chat/send` - Send message via HTTP (alternative to WebSocket)
- `GET /api/chat/<request_id>/history` - Get chat history for request

#### WebSocket Events (real-time, in `sockets/events.py`)
- `join_request` - Client joins request room for live updates
- `send_message` - Client sends chat message
- `receive_message` - Server broadcasts message to room
- `request_status_updated` - Broadcast status changes

### Key Functions
- Accept workflow: Mark as ACCEPTED, assign helper, trigger SMS
- Reject workflow: Keep as PENDING, allow other helpers to accept
- Complete workflow: Mark as COMPLETED, send notification
- Cancel workflow: Role-specific behavior (CANCELLED vs PENDING)
- Real-time message broadcasting via WebSocket
- Message persistence in database
- SMS notifications for state changes

## Frontend Responsibilities

### Files
- `frontend/src/member3/` - Component exports
- `frontend/src/components/ChatBox.jsx` - Real-time chat interface
- `frontend/src/pages/RequestDetails.jsx` - Request detail with actions and chat

### Components
- **ChatBox** - Real-time message display/input with WebSocket integration
  - Message history loading
  - Auto-scroll to latest messages
  - Directional message bubbles (left/right by sender)
  - Typing indicators
  - Loading states
  
- **RequestDetails** - Full request view with action suite
  - Accept/reject buttons (helper only)
  - Complete button (assigned helper only)
  - Cancel button (requester or assigned helper)
  - Status timeline visualization
  - Chat integration
  - Two-column layout (details + chat)

- **RequestActions** - (Can be extracted as needed) Action buttons component

### Features
- Accept emergency requests with assistant assignment
- Reject requests while keeping in pool
- Complete requests after assistance provided
- Cancel with role-specific behavior
- Real-time chat with message history
- Participant verification (only requester/helper can chat)
- Message persistence and recovery
- Sender identification (self vs other messages)
- WebSocket connection management
- Offline message queueing (optional enhancement)

## WebSocket Event Flow

```
Client Connected:
1. Client emits 'join_request' { request_id, user_id }
2. Client joins room: f"request_{request_id}"
3. Server adds client to room

Client Sends Message:
1. Client emits 'send_message' { request_id, content, sender_id }
2. Server validates sender participation
3. Server creates Message DB entry
4. Server emits 'receive_message' to room
5. All clients in room receive message

Request Status Change:
1. Helper puts accept/complete/cancel
2. Server emits 'request_status_updated' { request_id, status, helper_id }
3. All watching clients update UI

Client Disconnected:
1. Client leaves all joined rooms
2. Cleanup happens automatically
```

## Sample Usage

### Backend
```bash
# Get request details
curl -X GET http://localhost:5000/api/emergency/123 \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Accept request (helper)
curl -X PUT http://localhost:5000/api/emergency/123/accept \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Complete request (helper)
curl -X PUT http://localhost:5000/api/emergency/123/complete \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Cancel request (requester or helper)
curl -X PUT http://localhost:5000/api/emergency/123/cancel \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Get chat history (HTTP)
curl -X GET http://localhost:5000/api/chat/123/history \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Send message (HTTP)
curl -X POST http://localhost:5000/api/chat/send \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": 123,
    "content": "I am on my way"
  }'
```

### Frontend - WebSocket Integration
```javascript
// In ChatBox component
import { useContext, useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';

export default function ChatBox({ requestId }) {
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  
  useEffect(() => {
    if (!socket) return;
    
    // Join request room for real-time updates
    socket.emit('join_request', { request_id: requestId });
    
    // Listen for incoming messages
    socket.on('receive_message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });
    
    // Cleanup
    return () => {
      socket.off('receive_message');
    };
  }, [socket, requestId]);
  
  const sendMessage = (content) => {
    socket.emit('send_message', {
      request_id: requestId,
      content,
      sender_id: currentUserId
    });
  };
  
  return (
    <div className="chat-container">
      {/* Messages display */}
      {messages.map(msg => (
        <div key={msg.id} className={msg.sender_id === currentUserId ? 'sent' : 'received'}>
          {msg.sender_name}: {msg.content}
        </div>
      ))}
      
      {/* Message input */}
      <input 
        type="text" 
        placeholder="Type message..."
        onKeyPress={(e) => e.key === 'Enter' && sendMessage(e.target.value)}
      />
    </div>
  );
}
```

### Frontend - Request Actions
```javascript
// In RequestDetails component
async function handleAccept() {
  try {
    const response = await axios.put(
      `/api/emergency/${requestId}/accept`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setRequest(response.data.request);
    toast.success('Request accepted!');
  } catch (error) {
    toast.error(error.response?.data?.error || 'Failed to accept');
  }
}

async function handleComplete() {
  try {
    await axios.put(
      `/api/emergency/${requestId}/complete`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    toast.success('Request completed!');
    navigate('/dashboard');
  } catch (error) {
    toast.error(error.response?.data?.error || 'Failed to complete');
  }
}
```

## Key Technologies
- **Backend**: Flask, Flask-SocketIO, SQLAlchemy, Twilio SMS
- **Frontend**: React, Socket.io-client, Axios, React Hot Toast

## Request State Machine

```
         [PENDING]
        /         \
     accept      reject
     /             \
[ACCEPTED] -----> [PENDING]
    |              (stays pending
    |               for other helpers)
    |
  complete  OR  cancel (helper only)
    |              |
    v              v
[COMPLETED]    [PENDING]
               (reassign pool)

Requester can cancel anytime except COMPLETED/CANCELLED:
[PENDING] --cancel--> [CANCELLED]
[ACCEPTED] --cancel--> [CANCELLED]
```

## Contribution Guidelines
1. All request state logic stays in member3_management_routes.py
2. All chat endpoints stay in member3_chat_routes.py
3. WebSocket event handlers coordinate with Member 4 (history)
4. Always validate sender participation before allowing messages
5. Maintain SMS notification on state transitions
6. Test dual-role cancel behavior carefully
7. Keep message history queryable and performant

## Testing Checklist
- [ ] Accept transitions PENDING → ACCEPTED
- [ ] Reject keeps request PENDING
- [ ] Complete requires ACCEPTED state
- [ ] Helper can only complete their own assignments
- [ ] Requester can cancel until completion
- [ ] Helper can cancel accepted requests (reverts to PENDING)
- [ ] Messages persist in database
- [ ] Chat access limited to requester/helper only
- [ ] WebSocket broadcasts to correct room
- [ ] SMS notifications sent on state changes
- [ ] Unauthorized users get 403 errors
- [ ] Request not found returns 404
