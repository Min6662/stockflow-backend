#!/bin/bash

# Manual trigger for Render deployment
echo "🚀 Manually triggering Render deployment..."

# Check if the backend is updated
echo "🔍 Checking current backend version..."
curl -s https://stockflow-backend-l1js.onrender.com/api/health

echo -e "\n🧪 Testing static file serving..."
curl -s -o /dev/null -w "Status: %{http_code}" https://stockflow-backend-l1js.onrender.com/uploaded/test-image.txt

echo -e "\n🔄 Testing upload endpoint..."
curl -s -X POST https://stockflow-backend-l1js.onrender.com/api/upload

echo -e "\n📱 Testing product image access..."
curl -s -o /dev/null -w "Status: %{http_code}" "https://stockflow-backend-l1js.onrender.com/icon/uploaded/Muzii%20old-Photoroom_90746a01470449d7890356fc81321cfa.png"

echo -e "\n✅ Test complete!"
echo "If status codes are 404, the backend hasn't updated yet."
echo "Check your Render dashboard and manually trigger a deployment if needed."
