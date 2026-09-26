# Member 1: Authentication & Emergency Request Creation

## Overview
Member 1 is responsible for user authentication (login/registration) and initial emergency request creation functionality.

## Backend Responsibilities

### Files
- `backend/routes/member1_auth_routes.py` - User authentication routes
- `backend/routes/member1_request_routes.py` - Emergency request creation routes

### API Endpoints
#### Authentication (`member1_auth_routes.py`)
- `POST /api/auth/register` - Register new user (requester or helper)
- `POST /api/auth/login` - User login with email/password
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/logout` - Logout user

#### Emergency Creation (`member1_request_routes.py`)
- `POST /api/emergency/create` - Create new emergency request (requester only)

### Key Functions
- User registration with validation (email, password strength, phone format)
- JWT token generation for authenticated sessions
- Emergency request creation with location and urgency level
- WebSocket broadcasting of new emergency requests

## Frontend Responsibilities

### Files
- `frontend/src/member1/` - Component exports
- `frontend/src/pages/Login.jsx` - Login page UI
- `frontend/src/pages/Register.jsx` - Registration page UI
- `frontend/src/pages/CreateEmergency.jsx` - Emergency creation form

### Components
- **Login** - Email/password login interface
- **Register** - User registration form with role selection
- **CreateRequest** (CreateEmergency) - Emergency creation with map location picker

### Features
- Email validation and password strength checking
- Role selection (requester/helper)
- Map-based location detection and pinning
- Emergency type and urgency level selection
- Real-time helper availability display

## Sample Usage

### Backend
```bash
# User Registration
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "Secure123",
    "role": "requester",
    "phone": "1234567890"
  }'

# User Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "Secure123"
  }'

# Create Emergency Request
curl -X POST http://localhost:5000/api/emergency/create \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "emergency_type": "blood",
    "description": "Need O+ blood",
    "urgency_level": "high",
    "latitude": 23.8103,
    "longitude": 90.4125
  }'
```

### Frontend
```javascript
// In App.jsx or routing
import { Login, Register, CreateRequest } from './member1';

// Use in routes
<Route path="/login" element={<Login />} />
<Route path="/register" element={<Register />} />
<Route path="/create-emergency" element={<CreateRequest />} />
```

## Key Technologies
- **Backend**: Flask, JWT authentication, SQLAlchemy ORM
- **Frontend**: React, React Router, Axios, Google Maps API

## Contribution Guidelines
1. All authentication logic stays in member1_auth_routes.py
2. Emergency request creation logic stays in member1_request_routes.py
3. Do not mix with other member's functionality
4. Maintain backward compatibility with existing API
5. Update tests when modifying endpoints

## Testing Checklist
- [ ] Registration validation works (email, password, phone)
- [ ] Login generates valid JWT token
- [ ] Emergency request creation broadcasts via WebSocket
- [ ] Location coordinates are properly validated
- [ ] Role-based access is enforced for creation endpoint
