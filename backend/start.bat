@echo off
REM Backend startup script for Smart Emergency System (Windows)

setlocal enabledelayedexpansion

echo 🚀 Starting Smart Emergency System Backend...

REM Create virtual environment if not exists
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install/upgrade dependencies
echo 📥 Installing dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt

REM Create .env if not exists
if not exist ".env" (
    echo ⚙️  Creating .env from template...
    copy ..\env.example .env
    echo ⚠️  Please edit .env with your configuration before running server
)

REM Initialize database
echo 🗄️  Initializing database...
python -c "from app import create_app; app = create_app(); app.app_context().push()"

REM Start server
echo ✅ Backend server starting on http://localhost:5000
python app.py

pause
