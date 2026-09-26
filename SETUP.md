# Setup Guide

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 18

---

## 1. PostgreSQL Database Setup

1. Install PostgreSQL from https://www.postgresql.org/download/windows/
2. Open pgAdmin 4 → right-click **Databases** → **Create** → **Database**
3. Name it `smart_emergency`
4. Update `backend/.env` with your postgres password:
   ```
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/smart_emergency
   ```

---

## 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Start server
python app.py
```

Tables are created automatically on first run via `db.create_all()`.

---

## 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

---

## 4. Environment Variables

### Backend (`backend/.env`)

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/smart_emergency
JWT_SECRET_KEY=your-secret-key
FLASK_ENV=development
FLASK_HOST=0.0.0.0
FLASK_PORT=5000
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

## 5. Deployment

### Frontend — Vercel

1. Import GitHub repo at vercel.com
2. Set **Root Directory** to `frontend`
3. Add environment variables:
   - `VITE_BACKEND_URL` = your Render backend URL
   - `VITE_GOOGLE_MAPS_API_KEY` = your key
4. Deploy

### Backend — Render

1. Create a **Web Service** at render.com
2. Connect GitHub repo
3. Set **Root Directory** to `backend`
4. **Start Command**: `python app.py`
5. Add all environment variables from `backend/.env`
6. For the database, create a **PostgreSQL** service on Render and use the Internal Database URL as `DATABASE_URL`

---

## 6. Troubleshooting

**Port already in use (5000):**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <pid> /F
```

**CORS errors:**
- Ensure `FRONTEND_URL` in `backend/.env` matches your frontend URL exactly

**Database connection error:**
- Verify PostgreSQL is running
- Check `DATABASE_URL` credentials in `.env`

**Module import errors:**
- Ensure virtual environment is activated
- Run `pip install -r requirements.txt` again