# Smart Emergency Help & Coordination System
## Project Summary

**Course**: CSE471 — System Analysis and Design
**Group**: 10 | **Lab Section**: 02 | **Semester**: SPRING 26

| ID | Name |
|----|------|
| 23101458 | Md Shoieb Hossain |
| 23101218 | Asifur Rahman Bhuiyan |
| 22201268 | Md Shahriar Anam |
| 22201263 | Galib Tasfiq Abid |

---

## Tech Stack

- **Language**: Python (Flask) & JavaScript (React.js / Vite)
- **Framework**: Flask, Flask-SocketIO, React.js (Vite)
- **Styling**: TailwindCSS
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy (Flask-SQLAlchemy)
- **Deployment**: Frontend — Vercel / Backend — Render
- **APIs**: Google Maps API, Twilio API, OpenAI API

---

## Module 1

### Member-1 — User Registration & Login
Users can register and log in to the system. Requesters can create emergency requests specifying:
- Emergency type (Blood / Ambulance / Oxygen)
- Location (via Google Maps)
- Description
- Urgency level

### Member-2 — Role-Based Access Control
- Helpers can toggle their availability status to receive emergency requests
- The system dynamically maintains the list of currently available helpers

### Member-3 — Profile Management
Helpers can:
- Accept emergency requests
- Reject requests
- Mark requests as Completed

Request status flow: **Pending → Accepted → Completed / Cancelled**

### Member-4 — Availability Toggle System
Using Flask-SocketIO:
- Emergency status updates reflect instantly across all connected clients
- Dashboard updates automatically in real time

---

## Module 2

### Member-1 — Create Emergency Request System
Uses Google Maps API to:
- Show nearby helpers on an interactive map
- Display map markers for requester location
- Filter requests by Type, Status, Location, and Date

### Member-2 — Location-Based Search
After request acceptance:
- Requester and helper can communicate via real-time chat
- Messages are stored in the database
- Implemented using Flask-SocketIO

### Member-3 — Accept / Reject Request
Using Twilio API:
- Emergency alert SMS on request creation
- Acceptance confirmation SMS
- Status update notification SMS

### Member-4 — Real-Time Status Update
Users can view:
- Previously created requests
- Accepted tasks
- Chat history
- Status timeline (creation time, acceptance time, completion time)

---

## Module 3

### Member-1 — Interactive Dashboard
Displays:
- Total active emergencies
- Available helpers count
- Completed requests
- Recent activities feed

### Member-1 — Emergency Analytics
System generates:
- Most requested emergency type
- Completion rate
- Average response time

### Member-2 — Real-Time Chat System
System automatically flags emergencies as high-risk based on:
- Urgency level
- Response delay
- Helper availability

### Member-2 — Push Notification System
Emergency requests are automatically sorted based on urgency level and risk score.

### Member-3 — SMS Notification System
Each emergency request displays:
- Creation time
- Acceptance time
- Completion time

### Member-3 — Search & Filter
System tracks trends of emergency types over time to identify high-demand resources.

### Member-4 — Activity History Log
Using OpenAI API:
- Generates concise summaries of emergency descriptions
- Suggests urgency levels

### Member-4 — AI-Based Emergency Assistant
System calculates:
- Average handling time
- Response efficiency
- Helper participation rate