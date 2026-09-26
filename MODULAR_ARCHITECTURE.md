# Smart Emergency System - Modular Architecture Overview

## Project Structure

This document outlines the modular architecture designed to clearly demonstrate individual team member contributions during the viva presentation.

## Principle: Separation of Concerns

Each team member owns specific features that are clearly isolated:
- **Backend**: Separate Flask Blueprint files per member
- **Frontend**: Separate component folders per member
- **Models**: Separated into logical domain files
- **Each feature is independently explainable and testable**

---

## Backend Architecture

### Directory Structure
```
backend/
├── models/
│   ├── __init__.py                (Central export point)
│   ├── user_model.py              (User + UserRole enum)
│   ├── request_model.py           (EmergencyRequest + EmergencyType, UrgencyLevel, EmergencyStatus)
│   └── message_model.py           (Message model)
│
├── routes/
│   ├── member1_auth_routes.py     (Member 1: User registration, login, profile)
│   ├── member1_request_routes.py  (Member 1: Emergency request creation)
│   ├── member2_role_routes.py     (Member 2: Role-based access, availability toggle)
│   ├── member2_filter_routes.py   (Member 2: Search and filter emergencies/helpers)
│   ├── member3_management_routes.py (Member 3: Accept, reject, complete, cancel)
│   ├── member3_chat_routes.py     (Member 3: Chat messaging endpoints)
│   ├── member4_misc_routes.py     (Member 4: History, notifications, timeline)
│   │
│   └── [LEGACY - Kept for backward compatibility]
│       ├── auth.py                (Original - imported by app.py)
│       ├── emergency.py            (Original - imported by app.py)
│       ├── helper.py               (Original - imported by app.py)
│       └── notification.py         (Original - imported by app.py)
│
├── sockets/
│   └── events.py                  (WebSocket event handlers - shared infrastructure)
│
├── app.py                         (Main Flask app factory - imports all member blueprints)
├── config.py                      (Configuration management)
├── extensions.py                  (SQLAlchemy, JWT, etc. initialization)
└── requirements.txt               (Python dependencies)
```

### Member Responsibilities

```
MEMBER 1: Authentication & Request Creation
├── Backend: member1_auth_routes.py
│   ├── POST /api/auth/register
│   ├── POST /api/auth/login
│   ├── GET /api/auth/me
│   └── POST /api/auth/logout
│
└── Backend: member1_request_routes.py
    └── POST /api/emergency/create

MEMBER 2: Role-Based Access & Filtering
├── Backend: member2_role_routes.py
│   ├── GET /api/helper/profile
│   ├── PUT /api/helper/profile
│   └── PUT /api/helper/toggle-availability
│
└── Backend: member2_filter_routes.py
    ├── GET /api/emergency/all?type=...&status=...
    ├── GET /api/emergency/my
    └── GET /api/helper/available

MEMBER 3: Request Management & Chat
├── Backend: member3_management_routes.py
│   ├── GET /api/emergency/<id>
│   ├── PUT /api/emergency/<id>/accept
│   ├── PUT /api/emergency/<id>/reject
│   ├── PUT /api/emergency/<id>/complete
│   └── PUT /api/emergency/<id>/cancel
│
└── Backend: member3_chat_routes.py
    ├── POST /api/chat/send
    └── GET /api/chat/<request_id>/history

MEMBER 4: History & Dashboard
└── Backend: member4_misc_routes.py
    ├── GET /api/notification/messages/<request_id>
    └── GET /api/notification/history
```

### How to Register a New Blueprint (in app.py)

```python
# Step 1: Import the blueprint
from routes import member1_auth_routes

# Step 2: Register with app
app.register_blueprint(member1_auth_routes.bp)

# No url_prefix needed - routes already include /api/...
```

---

## Frontend Architecture

### Directory Structure
```
frontend/src/
├── member1/
│   ├── index.jsx                  (Exports: Login, Register, CreateRequest)
│   └── MEMBER_README.md           (Documentation)
│
├── member2/
│   ├── index.jsx                  (Exports: RoleToggle, FilterPanel)
│   └── MEMBER_README.md           (Documentation)
│
├── member3/
│   ├── index.jsx                  (Exports: ChatBox, RequestDetails)
│   └── MEMBER_README.md           (Documentation)
│
├── member4/
│   ├── index.jsx                  (Exports: Dashboard, History, StatusTimeline)
│   └── MEMBER_README.md           (Documentation)
│
├── pages/
│   ├── Login.jsx                  (Member 1)
│   ├── Register.jsx               (Member 1)
│   ├── CreateEmergency.jsx        (Member 1)
│   ├── RequestDetails.jsx         (Member 3)
│   ├── Dashboard.jsx              (Member 4)
│   └── NotificationHistory.jsx    (Member 4)
│
├── components/
│   ├── AvailabilityToggle.jsx     (Member 2)
│   ├── ChatBox.jsx                (Member 3)
│   ├── StatusTimeline.jsx         (Member 4)
│   ├── MapView.jsx                (Shared)
│   ├── EmergencyCard.jsx          (Shared)
│   └── AppNavbar.jsx              (Shared)
│
├── context/
│   ├── AuthContext.jsx            (Shared)
│   └── SocketContext.jsx          (Shared)
│
├── App.jsx                        (Main router)
├── main.jsx                       (Entry point)
├── index.css                      (Global styles)
└── socket.js                      (WebSocket client setup)
```

### Member Imports (in App.jsx or routing)

```javascript
// Member 1: Authentication
import { Login, Register, CreateRequest } from './member1';

// Member 2: Role & Filtering
import { RoleToggle } from './member2';

// Member 3: Chat & Management
import { ChatBox, RequestDetails } from './member3';

// Member 4: History & Dashboard
import { Dashboard, History, StatusTimeline } from './member4';

// In routes
<Route path="/login" element={<Login />} />
<Route path="/register" element={<Register />} />
<Route path="/create-emergency" element={<CreateRequest />} />
<Route path="/dashboard" element={<Dashboard />} />
<Route path="/history" element={<History />} />
<Route path="/request/:id" element={<RequestDetails />} />
```

---

## Models Layer

### User Model (backend/models/user_model.py)
- User table schema
- Password hashing and verification
- Relationships to EmergencyRequest and Message
- Role enumeration (REQUESTER, HELPER)

### Request Model (backend/models/request_model.py)
- EmergencyRequest table schema
- Status state machine (PENDING → ACCEPTED → COMPLETED, CANCELLED)
- Emergency type enumeration (BLOOD, AMBULANCE, OXYGEN)
- Urgency level enumeration (LOW, MEDIUM, HIGH)

### Message Model (backend/models/message_model.py)
- Message table schema
- Relationships to EmergencyRequest and User
- Timestamp indexing for query performance

### Central Import (backend/models/__init__.py)
```python
from models import User, EmergencyRequest, Message, UserRole, EmergencyStatus, EmergencyType, UrgencyLevel
```

---

## WebSocket Architecture (Shared Infrastructure)

Located in `backend/sockets/events.py` - handles real-time communication:

```python
# Events implemented
socketio.on('join_request')  → Client joins request room
socketio.on('send_message') → Client sends chat message
socketio.emit('receive_message', ...) → Server broadcasts message
socketio.emit('request_status_updated', ...) → Server broadcasts status changes
socketio.emit('new_emergency_request', ...) → Server broadcasts new requests
socketio.emit('helper_availability_updated', ...) → Server broadcasts helper status
```

---

## How to Present During Viva

### Member 1 Presentation
1. Overview: Authentication system and emergency creation
2. Backend: Show `member1_auth_routes.py` and `member1_request_routes.py`
3. Frontend: Show Login, Register, CreateEmergency pages
4. Database: Show User and EmergencyRequest models
5. Demonstrate: Register user → Login → Create emergency request
6. Highlight: JWT token generation, location-based request creation, WebSocket broadcast

### Member 2 Presentation
1. Overview: Role-based access control and search/filtering
2. Backend: Show `member2_role_routes.py` and `member2_filter_routes.py`
3. Frontend: Show AvailabilityToggle and filtering logic in Dashboard
4. Demonstrate: Helper profile update → Toggle availability → View available helpers
5. Demonstrate: Filter emergencies by type/status/date
6. Highlight: Decorator-based access control, flexible enum parsing, real-time availability updates

### Member 3 Presentation
1. Overview: Request lifecycle management and real-time chat
2. Backend: Show `member3_management_routes.py` and `member3_chat_routes.py`
3. Frontend: Show RequestDetails page with action buttons and ChatBox
4. Database: Show Message model
5. Demonstrate: Accept request → Send chat message → Complete request
6. Demonstrate: Dual-role cancel behavior (requester vs helper)
7. Highlight: State machine validation, message persistence, WebSocket integration, SMS notifications

### Member 4 Presentation
1. Overview: Dashboard analytics and emergency history management
2. Backend: Show `member4_misc_routes.py`
3. Frontend: Show Dashboard and NotificationHistory pages
4. Demonstrate: View dashboard with statistics → Navigate to history → See full timeline
5. Demonstrate: View messages and status events in history
6. Highlight: Query optimization for history retrieval, staggered animations, responsive layout

---

## API Summary - All Endpoints by Member

### Member 1 (6 endpoints)
- [POST] /api/auth/register
- [POST] /api/auth/login
- [GET] /api/auth/me
- [POST] /api/auth/logout
- [POST] /api/emergency/create

### Member 2 (6 endpoints)
- [GET] /api/helper/profile
- [PUT] /api/helper/profile
- [PUT] /api/helper/toggle-availability
- [GET] /api/emergency/all?type=...&status=...&date=...
- [GET] /api/emergency/my
- [GET] /api/helper/available

### Member 3 (6 endpoints)
- [GET] /api/emergency/<id>
- [PUT] /api/emergency/<id>/accept
- [PUT] /api/emergency/<id>/reject
- [PUT] /api/emergency/<id>/complete
- [PUT] /api/emergency/<id>/cancel
- [POST] /api/chat/send
- [GET] /api/chat/<request_id>/history

### Member 4 (2 endpoints)
- [GET] /api/notification/messages/<request_id>
- [GET] /api/notification/history

**Total: 20+ API endpoints clearly attributed**

---

## Running the Application

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
python app.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Key Design Principles

1. **Modularity**: Each member's code is isolated and can be explained independently
2. **Clarity**: File naming clearly indicates member ownership
3. **Backward Compatibility**: Original route files kept for compatibility
4. **Scalability**: Easy to add new members or features
5. **Maintainability**: Changes in one member's code don't affect others
6. **Testability**: Each module can be tested independently

---

## Migration Notes

- **Old routes**: Still registered in app.py for backward compatibility
- **New routes**: Follow member-based blueprint pattern
- **Models**: Unified through central `models/__init__.py` export
- **Zero breaking changes**: All endpoints function identically
- **Gradual transition**: Can slowly migrate API calls to new blueprint routes

---

## Additional Documentation

See individual MEMBER_README.md files in each component's directory for detailed technical documentation.
