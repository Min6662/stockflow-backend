const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { pool, testConnection, initializeDatabase } = require('./database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (for images)
app.use('/icon', express.static('icon'));
app.use('/uploads', express.static('uploads'));
app.use('/uploaded', express.static('uploaded'));

// Ensure upload directories exist
const ensureDirectoryExists = (dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✅ Created directory: ${dirPath}`);
    }
  } catch (error) {
    console.error(`❌ Failed to create directory ${dirPath}:`, error.message);
  }
};

// Create upload directories if they don't exist
ensureDirectoryExists('./icon');
ensureDirectoryExists('./uploads');
ensureDirectoryExists('./uploaded');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use uploads directory for all uploads
    const uploadDir = './uploads';
    ensureDirectoryExists(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = `${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-here';

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// File upload endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      success: true,
      message: 'File uploaded successfully',
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      url: fileUrl,
      fullUrl: `${req.protocol}://${req.get('host')}${fileUrl}`
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// API Key middleware (optional)
const verifyApiKey = (req, res, next) => {
  const apiKey = req.headers['authorization'];
  if (process.env.API_KEY && apiKey !== `Bearer ${process.env.API_KEY}`) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
};

// Helper function to transform product data for Flutter compatibility
function transformProductForFlutter(product) {
  return {
    ...product,
    // If price_out is 0 or null, use the price field instead
    price_out: (product.price_out && product.price_out !== '0.00') ? product.price_out : product.price
  };
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Flutter Products API is running',
    timestamp: new Date().toISOString()
  });
});

// Get all products (user-specific)
app.get('/api/products', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // First, let's check if the table exists and get its structure
    const [tables] = await pool.execute("SHOW TABLES LIKE 'products'");
    
    if (tables.length === 0) {
      // Table doesn't exist, return empty array
      return res.json([]);
    }

    // Get table structure
    const [columns] = await pool.execute("DESCRIBE products");
    console.log('Table structure:', columns);

    // Check if created_at and user_id columns exist
    const hasCreatedAt = columns.some(col => col.Field === 'created_at');
    const hasUserId = columns.some(col => col.Field === 'user_id');
    
    const orderBy = hasCreatedAt ? 'ORDER BY created_at DESC' : 'ORDER BY id DESC';
    
    let query;
    let params;
    
    if (hasUserId) {
      // Filter by user ID if user_id column exists
      query = `SELECT * FROM products WHERE user_id = ? ${orderBy}`;
      params = [userId];
    } else {
      // If no user_id column, return all products (backward compatibility)
      query = `SELECT * FROM products ${orderBy}`;
      params = [];
    }
    
    const [rows] = await pool.execute(query, params);
    
    // Transform products for Flutter compatibility
    const transformedProducts = rows.map(transformProductForFlutter);
    
    console.log(`Retrieved ${transformedProducts.length} products for user ${userId}`);
    res.json(transformedProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products', details: error.message });
  }
});

// Get single product by ID (user-specific)
app.get('/api/products/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if user_id column exists
    const [columns] = await pool.execute("DESCRIBE products");
    const hasUserId = columns.some(col => col.Field === 'user_id');
    
    let query;
    let params;
    
    if (hasUserId) {
      // Filter by both product ID and user ID if user_id column exists
      query = 'SELECT * FROM products WHERE id = ? AND user_id = ?';
      params = [req.params.id, userId];
    } else {
      // If no user_id column, use product ID only (backward compatibility)
      query = 'SELECT * FROM products WHERE id = ?';
      params = [req.params.id];
    }
    
    const [rows] = await pool.execute(query, params);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(transformProductForFlutter(rows[0]));
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create new product (user-specific)
app.post('/api/products', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      id,
      name,
      price,        // Your selling price (decimal)
      price_in,     // Your cost price (varchar in your table)
      quantity,     // Your quantity field
      image_path,   // Your image_path field
      price_out,    // Your price_out field (decimal)
      image_url     // Your image_url field
    } = req.body;

    // Validate required fields
    if (!id || !name) {
      return res.status(400).json({ 
        error: 'Missing required fields: id, name' 
      });
    }

    // Check if user_id column exists
    const [columns] = await pool.execute("DESCRIBE products");
    const hasUserId = columns.some(col => col.Field === 'user_id');
    
    let query;
    let params;
    
    if (hasUserId) {
      // Include user_id if column exists
      query = `INSERT INTO products 
               (id, name, price, price_in, quantity, image_path, price_out, image_url, user_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      params = [
        id, 
        name, 
        price || 0, 
        price_in || '0', 
        quantity || 0, 
        image_path || '', 
        price || 0, // Use price for price_out as well
        image_url || '',
        userId
      ];
    } else {
      // Original query without user_id (backward compatibility)
      query = `INSERT INTO products 
               (id, name, price, price_in, quantity, image_path, price_out, image_url)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      params = [
        id, 
        name, 
        price || 0, 
        price_in || '0', 
        quantity || 0, 
        image_path || '', 
        price || 0, // Use price for price_out as well
        image_url || ''
      ];
    }

    const [result] = await pool.execute(query, params);

    // Fetch the created product
    const [rows] = await pool.execute(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );

    console.log(`Product ${id} created successfully for user ${userId}`);
    res.status(201).json({
      message: 'Product created successfully',
      product: transformProductForFlutter(rows[0])
    });
  } catch (error) {
    console.error('Error creating product:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'Product with this ID already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create product' });
    }
  }
});

// Update product (user-specific)
app.put('/api/products/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      price,
      price_in,
      quantity,
      image_path,
      price_out,
      image_url
    } = req.body;

    // Check if user_id column exists
    const [columns] = await pool.execute("DESCRIBE products");
    const hasUserId = columns.some(col => col.Field === 'user_id');
    
    let query;
    let params;
    
    if (hasUserId) {
      // Include user_id check if column exists
      query = `UPDATE products 
               SET name = ?, price = ?, price_in = ?, quantity = ?, 
                   image_path = ?, price_out = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP
               WHERE id = ? AND user_id = ?`;
      params = [name, price || 0, price_in || '0', quantity || 0, image_path || '', price_out || 0, image_url || '', req.params.id, userId];
    } else {
      // Original query without user_id check (backward compatibility)
      query = `UPDATE products 
               SET name = ?, price = ?, price_in = ?, quantity = ?, 
                   image_path = ?, price_out = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP
               WHERE id = ?`;
      params = [name, price || 0, price_in || '0', quantity || 0, image_path || '', price_out || 0, image_url || '', req.params.id];
    }

    const [result] = await pool.execute(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found or access denied' });
    }

    // Fetch the updated product
    const [rows] = await pool.execute(
      'SELECT * FROM products WHERE id = ?',
      [req.params.id]
    );

    console.log(`Product ${req.params.id} updated successfully for user ${userId}`);

    res.json({
      message: 'Product updated successfully',
      product: transformProductForFlutter(rows[0])
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM products WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Search products
app.get('/api/products/search/:query', async (req, res) => {
  try {
    const searchQuery = `%${req.params.query}%`;
    const [rows] = await pool.execute(
      `SELECT * FROM products 
       WHERE name LIKE ? OR id LIKE ?
       ORDER BY created_at DESC`,
      [searchQuery, searchQuery]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'Failed to search products' });
  }
});

// Test database connection endpoint
app.post('/api/test-connection', async (req, res) => {
  try {
    const { host, port, database, user, password } = req.body;
    
    // Validate required fields
    if (!host || !port || !database || !user || !password) {
      return res.status(400).json({
        error: 'Missing required fields: host, port, database, user, password'
      });
    }

    // Create a temporary MySQL connection to test
    const mysql = require('mysql2/promise');
    const testConfig = {
      host: host,
      port: parseInt(port),
      user: user,
      password: password,
      database: database,
      ssl: {
        rejectUnauthorized: false
      }
    };

    let connection;
    try {
      connection = await mysql.createConnection(testConfig);
      await connection.execute('SELECT 1');
      
      // Test if products table exists
      const [tables] = await connection.execute(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_name = 'products'",
        [database]
      );
      
      const hasProductsTable = tables.length > 0;
      
      res.json({
        success: true,
        message: 'Database connection successful',
        hasProductsTable: hasProductsTable,
        database: database,
        host: host
      });
    } catch (dbError) {
      console.error('Database connection test failed:', dbError);
      res.status(400).json({
        success: false,
        error: 'Database connection failed',
        details: dbError.message
      });
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  } catch (error) {
    console.error('Error testing database connection:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Sales endpoints

// Get all sales
app.get('/api/sales', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = 'SELECT * FROM sales ORDER BY timestamp DESC';
    let params = [];
    
    if (startDate && endDate) {
      query = 'SELECT * FROM sales WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp DESC';
      params = [startDate, endDate];
    }
    
    const [rows] = await pool.execute(query, params);
    
    // Parse sale items from JSON
    const salesWithItems = rows.map(sale => ({
      ...sale,
      items: JSON.parse(sale.items || '[]')
    }));
    
    res.json(salesWithItems);
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
});

// Create new sale
app.post('/api/sales', async (req, res) => {
  try {
    const {
      id,
      timestamp,
      items,
      totalAmount,
      paymentMethod,
      customerName,
      notes
    } = req.body;

    // Validate required fields
    if (!id || !timestamp || !items || !totalAmount || !paymentMethod) {
      return res.status(400).json({ 
        error: 'Missing required fields: id, timestamp, items, totalAmount, paymentMethod' 
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO sales 
       (id, timestamp, items, total_amount, payment_method, customer_name, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        timestamp,
        JSON.stringify(items),
        totalAmount,
        paymentMethod,
        customerName || null,
        notes || null
      ]
    );

    res.status(201).json({
      message: 'Sale created successfully',
      saleId: id
    });
  } catch (error) {
    console.error('Error creating sale:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'Sale with this ID already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create sale' });
    }
  }
});

// Update product stock (subtract sold quantity)
app.put('/api/products/:id/stock', async (req, res) => {
  try {
    const { quantity, operation } = req.body;
    
    if (!quantity || !operation) {
      return res.status(400).json({ error: 'Missing required fields: quantity, operation' });
    }

    // Get current product
    const [rows] = await pool.execute(
      'SELECT quantity FROM products WHERE id = ?',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const currentQuantity = rows[0].quantity;
    let newQuantity;

    if (operation === 'subtract') {
      newQuantity = Math.max(0, currentQuantity - quantity);
    } else if (operation === 'add') {
      newQuantity = currentQuantity + quantity;
    } else {
      return res.status(400).json({ error: 'Invalid operation. Use "add" or "subtract"' });
    }

    // Update the product quantity
    const [result] = await pool.execute(
      'UPDATE products SET quantity = ? WHERE id = ?',
      [newQuantity, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ 
      message: 'Product stock updated successfully',
      productId: req.params.id,
      oldQuantity: currentQuantity,
      newQuantity: newQuantity
    });
  } catch (error) {
    console.error('Error updating product stock:', error);
    res.status(500).json({ error: 'Failed to update product stock' });
  }
});

// Get sales summary/analytics
app.get('/api/sales/summary', async (req, res) => {
  try {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // Get total sales
    const [totalSalesResult] = await pool.execute(
      'SELECT COUNT(*) as count, SUM(total_amount) as revenue FROM sales'
    );

    // Get today's sales
    const [todaySalesResult] = await pool.execute(
      'SELECT COUNT(*) as count, SUM(total_amount) as revenue FROM sales WHERE timestamp >= ? AND timestamp < ?',
      [todayStart.toISOString(), todayEnd.toISOString()]
    );

    // Get average sale amount
    const [avgSaleResult] = await pool.execute(
      'SELECT AVG(total_amount) as avgAmount FROM sales'
    );

    const summary = {
      totalSales: totalSalesResult[0].count || 0,
      totalRevenue: totalSalesResult[0].revenue || 0,
      todaySales: todaySalesResult[0].count || 0,
      todayRevenue: todaySalesResult[0].revenue || 0,
      averageSaleAmount: avgSaleResult[0].avgAmount || 0
    };

    res.json(summary);
  } catch (error) {
    console.error('Error fetching sales summary:', error);
    res.status(500).json({ error: 'Failed to fetch sales summary' });
  }
});

// Get sale by ID
app.get('/api/sales/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM sales WHERE id = ?',
      [req.params.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    
    const sale = {
      ...rows[0],
      items: JSON.parse(rows[0].items || '[]')
    };
    
    res.json(sale);
  } catch (error) {
    console.error('Error fetching sale:', error);
    res.status(500).json({ error: 'Failed to fetch sale' });
  }
});

// Authentication endpoints
const bcrypt = require('bcryptjs');

// User registration endpoint
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name, role = 'user' } = req.body;
  
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }

  try {
    // Check if user already exists
    const [existingUsers] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const [result] = await pool.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, name, role]
    );

    // Generate JWT token
    const token = jwt.sign(
      { id: result.insertId, email, role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: result.insertId,
        email,
        name,
        role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// User login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Find user
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
async function startServer() {
  try {
    // Test database connection
    await testConnection();
    
    // Initialize database tables
    await initializeDatabase();
    
    // Start the server on all interfaces so it's accessible from other devices
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
      console.log(`📱 Local access: http://localhost:${PORT}`);
      console.log(`🌐 Network access: http://192.168.100.142:${PORT}`);
      console.log(`📱 API endpoints available at http://192.168.100.142:${PORT}/api`);
      console.log(`🏥 Health check: http://192.168.100.142:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
