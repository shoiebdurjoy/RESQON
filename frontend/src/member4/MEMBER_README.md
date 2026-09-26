# Member 4: History, Dashboard & Notifications

## Overview
Member 4 is responsible for displaying user dashboards, emergency request history, message retrieval, and status timeline tracking. This member provides the overview/analytics experience for both requesters and helpers.

## Backend Responsibilities

### Files
- `backend/routes/member4_misc_routes.py` - History and notification endpoints

### API Endpoints

#### History & Notifications (`member4_misc_routes.py`)
- `GET /api/notification/messages/<request_id>` - Get all messages for a request
- `GET /api/notification/history` - Get user's complete emergency history with timeline

### Key Functions
- Fetch user's emergency requests (requester created / helper assigned)
- Load message history for display in timelines
- Build status timeline (created_at, accepted_at, completed_at)
- Serial message retrieval in chronological order
- Participant-only access verification

## Frontend Responsibilities

### Files
- `frontend/src/member4/` - Component exports
- `frontend/src/pages/Dashboard.jsx` - Main dashboard (dual view: requester/helper)
- `frontend/src/pages/NotificationHistory.jsx` - Emergency history page
- `frontend/src/components/StatusTimeline.jsx` - Visual status timeline

### Components

#### Dashboard
- **Section 1: Requester View**
  - "My Emergency Requests" grid
  - Cards showing: emergency type, urgency, status, location
  - Filter buttons (pending, accepted, completed, cancelled)
  - Stats row: counts by status
  - Click to view details
  
- **Section 2: Helper View**
  - "Pending Emergencies" list (available to accept)
    - Map preview for each
    - Type, urgency, description
    - Accept/Reject buttons
  - "My Assigned Tasks" list (accepted by you)
    - Status badges (accepted, completed)
    - Complete/Cancel buttons
  - "Completed Requests" (archived)
  - Helper stats: pending count, assigned count, completed count

#### History (NotificationHistory)
- Timeline view of all emergencies involving user
- For each emergency:
  - Request summary card
  - Status timeline (created → accepted → completed)
  - Message thread inline
  - Quick action buttons
- Staggered animation reveals
- Skeleton loading for async data

#### StatusTimeline
- Visual representation of request lifecycle
- Shows key timestamps:
  - Created: when request was posted
  - Accepted: when helper accepted
  - Completed: when work finished
- Elapsed time indicators
- Status badges at each checkpoint

### Features
- Comprehensive dashboard for both roles
- Real-time request count stats
- Message history with sender names
- Status timeline visualization
- Emergency type icons/colors
- Urgency level indicators
- Filter and search capabilities
- Responsive grid layout (3-col desktop, 1-col mobile)
- Skeleton loading for better UX
- Staggered animation reveals
- Two-column layout in history (optional)

## Sample Usage

### Backend
```bash
# Get messages for a specific request
curl -X GET http://localhost:5000/api/notification/messages/123 \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Get user's complete history
curl -X GET http://localhost:5000/api/notification/history \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### Frontend
```javascript
// In Dashboard component
import { Dashboard } from './member4';

// Usage
<Route path="/dashboard" element={<Dashboard />} />

// Component fetches:
// GET /api/emergency/my → user's requests
// GET /api/helper/available → available helpers (helpers only)
// GET /api/notification/messages/:id → message history

// In History/NotificationHistory page
import { History, StatusTimeline } from './member4';

<Route path="/history" element={<History />} />

// Component fetches:
// GET /api/notification/history → full history with messages and timeline

// StatusTimeline usage
<StatusTimeline 
  createdAt={request.created_at}
  acceptedAt={request.accepted_at}
  completedAt={request.completed_at}
  status={request.status}
/>
```

## Data Structure - User History Response

```javascript
{
  "history": [
    {
      "request": {
        "id": 123,
        "emergency_type": "blood",
        "description": "Need O+ blood",
        "urgency_level": "high",
        "status": "completed",
        "requester": { ...user_obj... },
        "helper": { ...user_obj... },
        "latitude": 23.8103,
        "longitude": 90.4125,
        "created_at": "2025-01-15T10:30:00",
        "accepted_at": "2025-01-15T10:35:00",
        "completed_at": "2025-01-15T10:50:00"
      },
      "messages": [
        {
          "id": 456,
          "sender_id": 1,
          "sender_name": "John",
          "content": "I am on my way",
          "timestamp": "2025-01-15T10:35:30"
        },
        ...
      ],
      "status_timeline": {
        "created_at": "2025-01-15T10:30:00",
        "accepted_at": "2025-01-15T10:35:00",
        "completed_at": "2025-01-15T10:50:00"
      }
    },
    ...more requests...
  ]
}
```

## Dashboard Sections & Statistics

### Requester Dashboard
```
┌─────────────────────────────────────┐
│ My Emergency Requests (3 total)     │
├──────────┬──────────┬───────────────┤
│ Pending  │ Accepted │ Completed     │
│    1     │    1     │      1        │
└──────────┴──────────┴───────────────┘

[Emergency Cards Grid - 3 columns]
- Emergency Type + Icon
- Description (truncated)
- Urgency Badge (color-coded)
- Status Badge
- Map Preview (optional)
```

### Helper Dashboard
```
┌──────────────────────────────────────┐
│ Available Work Stats                 │
├──────────────┬──────────┬────────────┤
│ Pending      │ Assigned │ Completed  │
│    5         │    2     │     12     │
└──────────────┴──────────┴────────────┘

[Available Requests Section]
- Filterable list
- Emergency cards with Quick Accept

[My Assigned Tasks Section]
- Tasks assigned to current helper
- Complete/Cancel buttons

[Completed Archive Section]
- View-only historical tasks
```

## Animation and UX Details

### Staggered Reveal
- List items animate in with 70-280ms stagger
- Fade + slide-up from bottom
- Skeleton loaders during async data load
- Reduced motion support for accessibility

### Status Badges
- Pending (yellow): `bg-yellow-100 text-yellow-800`
- Accepted (blue): `bg-blue-100 text-blue-800`
- Completed (green): `bg-green-100 text-green-800`
- Cancelled (red): `bg-red-100 text-red-800`

### Urgency Colors
- High (red): `text-red-600 border-l-4 border-red-500`
- Medium (orange): `text-orange-600 border-l-4 border-orange-500`
- Low (green): `text-green-600 border-l-4 border-green-500`

## Key Technologies
- **Backend**: Flask, SQLAlchemy queries
- **Frontend**: React, Axios, Tailwind CSS animations

## Contribution Guidelines
1. All history/notification endpoints stay in member4_misc_routes.py
2. Dashboard logic stays in Dashboard.jsx (don't move to multiple files)
3. History timeline logic stays in NotificationHistory.jsx
4. Coordinate with Member 3 for real-time updates
5. Keep queries efficient for large request volumes
6. Maintain consistent message ordering (oldest first)
7. Test with different role views (requester vs helper)

## Performance Considerations
- Paginate history for users with many requests (optional enhancement)
- Cache user stats (refresh on socket updates)
- Lazy-load messages for long histories
- Index by user_id and status for fast queries
- Consider materialized view for stats

## Testing Checklist
- [ ] Dashboard shows correct stats for requester
- [ ] Dashboard shows correct stats for helper
- [ ] History includes all user's requests
- [ ] Messages ordered oldest-first in history
- [ ] Status timeline shows correct timestamps
- [ ] Participants-only access enforced
- [ ] Animations work smoothly
- [ ] Responsive layout on mobile
- [ ] Skeleton loaders appear during load
- [ ] Real-time updates via WebSocket
- [ ] Empty states display appropriately
- [ ] Filter/search works correctly
- [ ] No memory leaks in component cleanup
- [ ] Performance acceptable with 100+ request history

## Known Enhancements (Future Work)
- Pagination for large histories
- Advanced filtering (date range, type, status)
- Export to PDF/CSV
- Search by requester/helper name
- Analytics dashboard with time-series charts
- Social sharing of request status
- Audit trail with complete change history
