#!/bin/bash
# Smart Tred Application Launcher
# راه‌انداز اپلیکیشن Smart Tred

echo ""
echo "╔════════════════════════════════════════╗"
echo "║    Smart Tred - Application Launcher   ║"
echo "║  راه‌انداز اپلیکیشن Smart Tred        ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Check if directories exist
if [ ! -d "app" ]; then
    echo "Error: app directory not found!"
    exit 1
fi

if [ ! -d "ui" ]; then
    echo "Error: ui directory not found!"
    exit 1
fi

# Start Backend
echo "Starting Backend Server..."
cd app
python -m venv venv
source venv/bin/activate
python -m pip install -e . > /dev/null 2>&1
python -m uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

sleep 2

# Start Frontend
echo "Starting Frontend Server..."
cd ../ui
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Both servers are starting..."
echo ""
echo "Frontend: http://localhost:3000 or http://localhost:5173"
echo "Backend API: http://localhost:8000"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
