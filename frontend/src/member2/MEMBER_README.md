# Member 2: Role-Based Access Control & Search/Filtering

## Overview
Member 2 is responsible for managing user roles, permissions, availability toggling, and implementing search/filtering capabilities for emergency requests.

## Backend Responsibilities

### Files
- `backend/routes/member2_role_routes.py` - Role-based access and availability management
- `backend/routes/member2_filter_routes.py` - Search and filtering for requests and helpers

### API Endpoints

#### Role & Access Management (`member2_role_routes.py`)
- `GET /api/helper/profile` - Get helper profile (helper only)
- `PUT /api/helper/profile` - Update helper profile (helper only)
- `PUT /api/helper/toggle-availability` - Toggle helper availability (helper only)

#### Search & Filtering (`member2_filter_routes.py`)
- `GET /api/emergency/all` - Get all emergencies with optional filters
  - Query params: `?type=blood&status=pending&date=2025-01-15`
- `GET /api/emergency/my` - Get user's requests (requester: created, helper: assigned)
- `GET /api/helper/available` - Get list of available helpers (public)

### Key Functions
- Role-based decorators for helper-only endpoints
- Profile update with flexible field validation
- Real-time availability toggle via WebSocket
- Filter emergencies by type, status, date
- Retrieve user-specific requests based on role

## Frontend Responsibilities

### Files
- `frontend/src/member2/` - Component exports
- `frontend/src/components/AvailabilityToggle.jsx` - Availability toggle UI
- `frontend/src/pages/Dashboard.jsx` - Uses filtering for dashboard views

### Components
- **RoleToggle** (AvailabilityToggle) - Helper availability on/off toggle with status indicator
- **FilterPanel** - (To be created) Search/filter UI for emergency requests

### Features
- Helper profile management (name, phone, skills, blood group)
- Real-time availability toggle with socket broadcasting
- Filter emergencies by:
  - Emergency type (blood, ambulance, oxygen)
  - Status (pending, accepted, completed, cancelled)
  - Date created
- View available helpers list
- Role-based access enforcement (helpers vs requesters)

## Sample Usage

### Backend
```bash
# Get helper profile
curl -X GET http://localhost:5000/api/helper/profile \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Update helper profile
curl -X PUT http://localhost:5000/api/helper/profile \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Helper",
    "phone": "9876543210",
    "skills": ["CPR", "First Aid"],
    "blood_group": "O+"
  }'

# Toggle availability
curl -X PUT http://localhost:5000/api/helper/toggle-availability \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Get all emergencies (with filters)
curl -X GET "http://localhost:5000/api/emergency/all?type=blood&status=pending" \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Get my requests
curl -X GET http://localhost:5000/api/emergency/my \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Get available helpers
curl -X GET http://localhost:5000/api/helper/available
```

### Frontend
```javascript
// In components using Member 2 features
import { RoleToggle } from './member2';

// Usage
<RoleToggle onToggle={handleAvailabilityChange} />

// Filtering in hooks
const fetchEmergencies = async (filters) => {
  const params = new URLSearchParams();
  if (filters.type) params.append('type', filters.type);
  if (filters.status) params.append('status', filters.status);
  if (filters.date) params.append('date', filters.date);
  
  const response = await axios.get(`/api/emergency/all?${params}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data.requests;
};
```

## Key Technologies
- **Backend**: Flask, Role-based decorators, SQLAlchemy queries
- **Frontend**: React hooks, Axios, Real-time state management

## Access Control Patterns

### Helper-Only Endpoints
- Decorated with `@helper_required`
- Automatically returns 403 if user is not a helper
- Helper object stored in `g.current_helper`

### Requester-Only Endpoints
- Decorated with `@requester_required`
- Automatically returns 403 if user is not a requester
- Requester object stored in `g.current_requester`

### Public Endpoints
- No auth required
- `/api/helper/available` is public for discovery

## Contribution Guidelines
1. All role-based logic stays in member2_role_routes.py
2. All filtering/search logic stays in member2_filter_routes.py
3. Use provided decorators for access control
4. Maintain consistent enum parsing (case-insensitive)
5. Keep filter parameters flexible and backward compatible
6. Test role enforcement carefully

## Testing Checklist
- [ ] Helper profile CRUD works correctly
- [ ] Availability toggle broadcasts via WebSocket
- [ ] Filters work individually and in combination
- [ ] Role-based access is properly enforced
- [ ] Available helpers list is accurate
- [ ] Status 403 returned for unauthorized roles
- [ ] Date filtering handles timezone correctly
- [ ] Enum parsing works with different case formats
