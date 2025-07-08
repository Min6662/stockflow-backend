#!/bin/bash

# Deploy to Render Script
# This script helps you deploy your updated backend to Render

echo "🚀 Preparing deployment to Render..."

# Check if we're in the correct directory
if [ ! -f "server.js" ]; then
    echo "❌ Error: server.js not found. Please run this script from the backend-deploy directory."
    exit 1
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit"
fi

# Add and commit changes
echo "📝 Adding changes to git..."
git add .
git commit -m "Update backend with file upload support and static file serving - $(date)"

# Check if Render remote exists
if ! git remote | grep -q "render"; then
    echo "⚠️  No 'render' remote found. Please add your Render git repository as a remote:"
    echo "   git remote add render <your-render-git-url>"
    echo "   Then run: git push render main"
    exit 1
else
    echo "🚀 Pushing to Render..."
    git push render main
fi

echo "✅ Deployment initiated! Check your Render dashboard for deployment status."
echo "🔗 Your backend should be available at: https://your-app-name.onrender.com"
echo "🧪 Test the health endpoint: curl https://your-app-name.onrender.com/api/health"
