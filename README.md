# Smart Emergency Help & Coordination System

**CSE471: System Analysis and Design — Group 10, Lab Section 02, SPRING 26**

| ID | Name |
|----|------|
| 23101458 | Md Shoieb Hossain |
| 23101218 | Asifur Rahman Bhuiyan |
| 22201268 | Md Shahriar Anam |
| 22201263 | Galib Tasfiq Abid |

---

## Tech Stack

- **Language**: Python (Flask) & JavaScript (React)
- **Framework**: Flask, Flask-SocketIO, React.js (Vite)
- **Styling**: TailwindCSS
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy (Flask-SQLAlchemy)
- **Deployment**: Frontend — Vercel / Backend — Render
- **APIs**: Google Maps API, Twilio API, OpenAI API

---

## Live Demo

- **Frontend**: https://smart-emergency-system-ses.vercel.app
- **Backend**: https://smart-emergency-system-ses.onrender.com

---

## Local Development Setup

### Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
# Edit backend/.env — set DATABASE_URL, JWT_SECRET_KEY, and API keys

# Run server
python app.py
```

Backend runs at: `http://localhost:5000`

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
# Edit frontend/.env — set VITE_BACKEND_URL and VITE_GOOGLE_MAPS_API_KEY

# Run dev server
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## Environment Variables

### Backend (`backend/.env`)

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/smart_emergency
JWT_SECRET_KEY=your-secret-key
FLASK_ENV=development
FRONTEND_URL=http://localhost:5173
GOOGLE_MAPS_API_KEY=your_key
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
OPENAI_API_KEY=your_key
```

### Frontend (`frontend/.env`)

```env
VITE_BACKEND_URL=http://localhost:5000
VITE_GOOGLE_MAPS_API_KEY=your_key
```

---

## API Endpoints

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET  /api/auth/me`
- `POST /api/auth/logout`

### Emergency
- `POST /api/emergency/create`
- `GET  /api/emergency/all`
- `GET  /api/emergency/my`
- `GET  /api/emergency/<id>`
- `PUT  /api/emergency/<id>/accept`
- `PUT  /api/emergency/<id>/reject`
- `PUT  /api/emergency/<id>/complete`
- `PUT  /api/emergency/<id>/cancel`

### Helper
- `GET  /api/helper/profile`
- `PUT  /api/helper/profile`
- `PUT  /api/helper/toggle-availability`
- `GET  /api/helper/available`

### Chat
- `POST /api/chat/send`
- `GET  /api/chat/<request_id>/history`

### Notifications & History
- `GET  /api/notification/history`

### Analytics
- `GET  /api/dashboard/stats`
- `GET  /api/analytics/summary`
- `GET  /api/analytics/performance`
- `GET  /api/analytics/trends`

### Risk & AI
- `GET  /api/emergency/risk-flags`
- `GET  /api/emergency/sorted`
- `POST /api/ai/summarize`

---

## Socket Events

### Client → Server
- `join_room` — `{ request_id }`
- `send_message` — `{ request_id, sender_id, content }`
- `leave_room` — `{ request_id }`

### Server → Client
- `receive_message`
- `new_emergency_request`
- `request_status_updated`
- `helper_availability_updated`