#!/bin/bash

echo "🚀 Complete Render Deployment with Database Configuration"
echo "======================================================="

# Check if we're in the right directory
if [ ! -f "server.js" ]; then
    echo "❌ Error: Please run this from the backend-deploy directory"
    exit 1
fi

echo "🔧 Your Database Configuration:"
echo "   Host: 154.90.45.217"
echo "   User: Min"
echo "   Database: Mindb"
echo "   Port: 3306"
echo ""

echo "📦 Creating deployment package with database config..."

# Create the deployment package
tar -czf stockflow-backend-complete.tar.gz \
    server.js \
    database.js \
    package.json \
    package-lock.json \
    .env \
    icon/ \
    uploads/ \
    uploaded/ \
    2>/dev/null

echo "✅ Package created: stockflow-backend-complete.tar.gz"
echo ""
echo "🔗 Render Deployment Steps:"
echo ""
echo "1. 🌐 Go to https://render.com and login/signup"
echo ""
echo "2. 🆕 Create New Web Service:"
echo "   - Click 'New' → 'Web Service'"
echo "   - Choose 'Deploy without GitHub repository'"
echo "   - Upload: stockflow-backend-complete.tar.gz"
echo ""
echo "3. ⚙️  Service Configuration:"
echo "   Name: stockflow-backend"
echo "   Runtime: Node"
echo "   Build Command: npm install"
echo "   Start Command: npm start"
echo "   Instance Type: Free (for testing)"
echo ""
echo "4. 🔐 Environment Variables (IMPORTANT!):"
echo "   Add these EXACT variables in Render Dashboard:"
echo ""
echo "   NODE_ENV=production"
echo "   PORT=10000"
echo "   DB_HOST=154.90.45.217"
echo "   DB_USER=Min"
echo "   DB_PASSWORD=Min-591424"
echo "   DB_NAME=Mindb"
echo "   DB_PORT=3306"
echo "   API_KEY=stockflow_secure_key_2025"
echo ""
echo "5. 🚀 Deploy:"
echo "   - Click 'Create Web Service'"
echo "   - Wait for deployment (2-5 minutes)"
echo "   - Your API will be at: https://stockflow-backend-[random].onrender.com"
echo ""
echo "6. 🧪 Test your deployment:"
echo "   curl https://your-service-name.onrender.com/api/health"
echo "   curl https://your-service-name.onrender.com/api/products"
echo ""
echo "📁 Package location: $(pwd)/stockflow-backend-complete.tar.gz"
echo ""
echo "💡 Pro Tips:"
echo "   - Render URL will be automatically generated"
echo "   - Free tier has some limitations but perfect for testing"
echo "   - Logs are available in Render Dashboard"
echo "   - Environment variables are secure and encrypted"
echo ""
echo "🔄 After deployment, run:"
echo "   ./switch_to_render.sh"
echo "   (to update your Flutter app with the new URL)"
