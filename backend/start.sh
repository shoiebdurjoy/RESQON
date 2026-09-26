#!/bin/bash
# Backend startup script for Smart Emergency System

set -e

echo "🚀 Starting Smart Emergency System Backend..."

# Create virtual environment if not exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install/upgrade dependencies
echo "📥 Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Create .env if not exists
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env from template..."
    cp ../.env.example .env
    echo "⚠️  Please edit .env with your configuration before running server"
fi

# Initialize database
echo "🗄️  Initializing database..."
python -c "from app import create_app; app = create_app(); app.app_context().push()"

# Start server
echo "✅ Backend server starting on http://localhost:5000"
python app.py
