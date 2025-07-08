#!/bin/bash

# StockFlow Backend - Cloud Deployment Preparation Script

echo "🚀 Preparing StockFlow Backend for Cloud Deployment..."

# Create deployment directory
DEPLOY_DIR="/Users/min/Desktop/My App/backend-deploy"
mkdir -p "$DEPLOY_DIR"

echo "📁 Created deployment directory: $DEPLOY_DIR"

# Copy necessary files
cp -r "/Users/min/Desktop/My App/backend/"* "$DEPLOY_DIR/"

# Remove development files not needed for deployment
rm -f "$DEPLOY_DIR/setup_autostart.sh"
rm -f "$DEPLOY_DIR/setup_pm2.sh"
rm -f "$DEPLOY_DIR/start_backend.sh"
rm -f "$DEPLOY_DIR/stop_backend.sh"
rm -f "$DEPLOY_DIR/com.stockflow.backend.plist"
rm -rf "$DEPLOY_DIR/logs"
rm -rf "$DEPLOY_DIR/node_modules"

echo "🧹 Cleaned up development files"

# Create production package.json with optimized scripts
cat > "$DEPLOY_DIR/package.json" << 'EOF'
{
  "name": "stockflow-backend",
  "version": "1.0.0",
  "description": "StockFlow Backend API for product management",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.6.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "keywords": ["stockflow", "api", "mysql", "express"],
  "author": "Min",
  "license": "MIT"
}
EOF

# Create .env template for cloud deployment
cat > "$DEPLOY_DIR/.env.example" << 'EOF'
# Database Configuration
DB_HOST=154.90.45.217
DB_PORT=3306
DB_NAME=Mindb
DB_USER=Min
DB_PASSWORD=Min-591424

# Server Configuration
PORT=3001
NODE_ENV=production
EOF

# Create README for deployment
cat > "$DEPLOY_DIR/README.md" << 'EOF'
# StockFlow Backend - Cloud Deployment

## Environment Variables Required

Set these in your cloud platform dashboard:

```
DB_HOST=154.90.45.217
DB_PORT=3306
DB_NAME=Mindb
DB_USER=Min
DB_PASSWORD=Min-591424
PORT=3001
NODE_ENV=production
```

## Deployment Platforms

### Railway
1. Connect GitHub repo
2. Add environment variables
3. Deploy automatically

### Render
1. Connect GitHub repo
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Add environment variables

### Heroku
1. Create new app
2. Connect GitHub repo
3. Add environment variables in Config Vars
4. Deploy from GitHub

## API Endpoints

- Health: `/api/health`
- Products: `/api/products`
- Test Connection: `/api/test-connection`
EOF

# Create Dockerfile for containerized deployment
cat > "$DEPLOY_DIR/Dockerfile" << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Start the application
CMD ["npm", "start"]
EOF

# Create .gitignore for deployment
cat > "$DEPLOY_DIR/.gitignore" << 'EOF'
node_modules/
.env
.env.local
.DS_Store
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.npm
.eslintcache
.nyc_output
coverage/
.vscode/
EOF

echo "✅ Deployment files prepared!"
echo ""
echo "📋 Next Steps:"
echo "1. Create a GitHub repository for: $DEPLOY_DIR"
echo "2. Push the code to GitHub"
echo "3. Choose a cloud platform (Railway recommended)"
echo "4. Connect your GitHub repo to the platform"
echo "5. Add environment variables from .env.example"
echo "6. Deploy!"
echo ""
echo "🌐 After deployment, update your Flutter app with the new URL"
echo "   in lib/services/settings_service.dart (cloudApiBaseUrl)"
echo ""
echo "📁 Deployment files are in: $DEPLOY_DIR"
