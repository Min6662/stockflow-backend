#!/bin/bash

# Test Backend Locally
echo "🧪 Testing backend locally..."

# Check if we're in the correct directory
if [ ! -f "server.js" ]; then
    echo "❌ Error: server.js not found. Please run this script from the backend-deploy directory."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Start the server in background
echo "🚀 Starting server..."
npm start &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Test health endpoint
echo "🏥 Testing health endpoint..."
curl -s http://localhost:3000/api/health

# Test static file serving
echo -e "\n📁 Testing static file serving..."
curl -s -o /dev/null -w "Status: %{http_code}" http://localhost:3000/uploaded/test-image.txt

# Test file upload (if you have a test image)
echo -e "\n📤 Testing file upload endpoint..."
curl -s -X POST -F "image=@test-image.txt" http://localhost:3000/api/upload

# Clean up
echo -e "\n🧹 Stopping server..."
kill $SERVER_PID

echo -e "\n✅ Local testing complete!"
