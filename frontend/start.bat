@echo off
REM Frontend startup script for Smart Emergency System (Windows)

echo 🚀 Starting Smart Emergency System Frontend...

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install
)

REM Create .env if not exists
if not exist ".env" (
    echo ⚙️  Creating .env from template...
    copy .env.example .env
    echo ⚠️  Please edit .env with your backend URL and Google Maps API key
)

REM Start development server
echo ✅ Frontend server starting on http://localhost:5173
call npm run dev

pause
