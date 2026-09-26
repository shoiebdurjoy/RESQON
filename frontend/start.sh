#!/bin/bash
# Frontend startup script for Smart Emergency System

set -e

echo "🚀 Starting Smart Emergency System Frontend..."

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Create .env if not exists
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your backend URL and Google Maps API key"
fi

# Start development server
echo "✅ Frontend server starting on http://localhost:5173"
npm run dev
