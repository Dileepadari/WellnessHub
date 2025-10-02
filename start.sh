#!/bin/bash

# Script to start both backend and frontend services

echo "🚀 Starting WellnessHub Full Stack Application..."

# Function to handle cleanup on exit
cleanup() {
    echo "🛑 Shutting down services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up trap to handle cleanup
trap cleanup SIGINT SIGTERM

# Start backend server
echo "📡 Starting backend server..."
cd server
npm start &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend development server
echo "🎨 Starting frontend development server..."
cd ../client
npm start &
FRONTEND_PID=$!

echo ""
echo "✅ Both services are starting up!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:5000"
echo "📚 API Docs: http://localhost:5000/api-docs"
echo ""
echo "Press Ctrl+C to stop both services"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID