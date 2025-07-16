#!/bin/bash

echo "🚀 Quick Render Deployment Setup"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "server.js" ]; then
    echo "❌ Error: Please run this from the backend-deploy directory"
    exit 1
fi

echo "📦 Creating deployment package..."

# Create a deployment archive
tar -czf stockflow-backend.tar.gz \
    server.js \
    database.js \
    package.json \
    package-lock.json \
    .env.example \
    icon/ \
    uploads/ \
    uploaded/ \
    Dockerfile \
    --exclude=node_modules

echo "✅ Package created: stockflow-backend.tar.gz"
echo ""
echo "🔗 Next Steps:"
echo "1. Go to https://render.com"
echo "2. Click 'New' → 'Web Service'"
echo "3. Choose 'Deploy without GitHub'"
echo "4. Upload the stockflow-backend.tar.gz file"
echo "5. Configure these settings:"
echo ""
echo "   📋 Service Configuration:"
echo "   - Name: stockflow-backend"
echo "   - Runtime: Node"
echo "   - Build Command: npm install"
echo "   - Start Command: npm start"
echo "   - Instance Type: Free (for testing)"
echo ""
echo "   🔧 Environment Variables:"
echo "   - NODE_ENV=production"
echo "   - PORT=10000"
echo "   - DB_HOST=your_database_host"
echo "   - DB_USER=your_database_user" 
echo "   - DB_PASSWORD=your_database_password"
echo "   - DB_NAME=stockflow"
echo ""
echo "6. Click 'Create Web Service'"
echo "7. Wait for deployment to complete"
echo "8. Test your API at: https://your-service-name.onrender.com/api/health"
echo ""
echo "📁 Package location: $(pwd)/stockflow-backend.tar.gz"
