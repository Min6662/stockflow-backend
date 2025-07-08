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
