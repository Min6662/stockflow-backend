# Render Deployment Guide for StockFlow Backend

## ✅ Changes Made

### 1. Backend Updates (`/backend-deploy/`)
- ✅ Added required directories: `icon/`, `uploads/`, `uploaded/`
- ✅ Added multer dependency for file uploads
- ✅ Added file upload endpoint: `POST /api/upload`
- ✅ Added directory existence checks to prevent errors
- ✅ Enhanced static file serving with proper error handling

### 2. Flutter App Updates
- ✅ Added file upload method to ApiService
- ✅ Enhanced product image handling
- ✅ Product list now supports backend image URLs

### 3. Created Helper Scripts
- ✅ `test_local.sh` - Test backend locally
- ✅ `deploy_to_render.sh` - Deploy to Render

## 🚀 Next Steps for Deployment

### Step 1: Deploy to Render

1. **Navigate to your backend-deploy directory:**
   ```bash
   cd "/Users/min/Desktop/My App/backend-deploy"
   ```

2. **Add your Render git repository as a remote (if not already done):**
   ```bash
   git remote add render <YOUR_RENDER_GIT_URL>
   ```

3. **Deploy using the script:**
   ```bash
   ./deploy_to_render.sh
   ```

   **OR manually:**
   ```bash
   git add .
   git commit -m "Add file upload support and static file serving"
   git push render main
   ```

### Step 2: Test After Deployment

1. **Check health endpoint:**
   ```bash
   curl https://stockflow-backend-l1js.onrender.com/api/health
   ```

2. **Test static file serving:**
   ```bash
   curl https://stockflow-backend-l1js.onrender.com/uploaded/test-image.txt
   ```

3. **Test file upload (with a real image):**
   ```bash
   curl -X POST -F "image=@your-test-image.jpg" https://stockflow-backend-l1js.onrender.com/api/upload
   ```

### Step 3: Test Flutter App

1. **Run your Flutter app:**
   ```bash
   flutter run -d chrome
   ```

2. **Test product images:**
   - Add a new product with an image
   - Verify the image appears in the product list
   - Test the "View Image" feature

## 📝 Key URLs to Test

- **Health Check:** `https://stockflow-backend-l1js.onrender.com/api/health`
- **Products API:** `https://stockflow-backend-l1js.onrender.com/api/products`
- **File Upload:** `https://stockflow-backend-l1js.onrender.com/api/upload`
- **Static Files:** `https://stockflow-backend-l1js.onrender.com/uploaded/`

## 🔧 New Features Added

1. **File Upload Endpoint:** `/api/upload`
   - Accepts image files up to 5MB
   - Returns file URL for storing in products
   - Generates unique filenames to prevent conflicts

2. **Enhanced Static File Serving:**
   - Serves files from `/icon`, `/uploads`, `/uploaded`
   - Automatically creates directories if missing
   - Proper error handling

3. **Flutter Integration:**
   - `ApiService.uploadFile()` method for file uploads
   - Enhanced product image handling
   - Better image URL resolution

## 🐛 Troubleshooting

If images still don't load after deployment:

1. **Check Render logs** for any errors
2. **Verify directory permissions** on Render
3. **Test upload endpoint** directly with curl
4. **Check if uploaded files persist** after deployment

## 📱 Flutter App Testing Checklist

- [ ] App runs in Chrome
- [ ] Product list loads
- [ ] Images display in product list
- [ ] "View Image" dialog works
- [ ] Product deletion works
- [ ] Add new product works
- [ ] Image upload works (if implementing)

## 🎯 Expected Results

After successful deployment:
- Product images should load in the Flutter app
- Static file URLs should be accessible
- File upload should work for future features
- All existing functionality should remain intact
