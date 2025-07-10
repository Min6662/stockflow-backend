const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
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
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Create upload directories if they don't exist
ensureDirectoryExists('./icon');
ensureDirectoryExists('./uploads');
ensureDirectoryExists('./uploaded');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // You can customize the destination based on file type or request
    const uploadDir = './uploaded';
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

// File upload endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/uploaded/${req.file.filename}`;
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

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    // First, let's check if the table exists and get its structure
    const [tables] = await pool.execute("SHOW TABLES LIKE 'products'");
    
    if (tables.length === 0) {
      // Table doesn't exist, return empty array
      return res.json([]);
    }

    // Get table structure
    const [columns] = await pool.execute("DESCRIBE products");
    console.log('Table structure:', columns);

    // Check if created_at column exists
    const hasCreatedAt = columns.some(col => col.Field === 'created_at');
    
    const orderBy = hasCreatedAt ? 'ORDER BY created_at DESC' : 'ORDER BY id DESC';
    
    const [rows] = await pool.execute(`SELECT * FROM products ${orderBy}`);
    
    // Transform products for Flutter compatibility
    const transformedProducts = rows.map(transformProductForFlutter);
    
    res.json(transformedProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products', details: error.message });
  }
});

// Get single product by ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM products WHERE id = ?',
      [req.params.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(transformProductForFlutter(rows[0]));
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create new product
app.post('/api/products', async (req, res) => {
  try {
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

    const [result] = await pool.execute(
      `INSERT INTO products 
       (id, name, price, price_in, quantity, image_path, price_out, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, 
        name, 
        price || 0, 
        price_in || '0', 
        quantity || 0, 
        image_path || '', 
        price || 0, // Use price for price_out as well
        image_url || ''
      ]
    );

    // Fetch the created product
    const [rows] = await pool.execute(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );

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

// Update product
app.put('/api/products/:id', async (req, res) => {
  try {
    const {
      name,
      price,
      price_in,
      quantity,
      image_path,
      price_out,
      image_url
    } = req.body;

    const [result] = await pool.execute(
      `UPDATE products 
       SET name = ?, price = ?, price_in = ?, quantity = ?, 
           image_path = ?, price_out = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, price || 0, price_in || '0', quantity || 0, image_path || '', price_out || 0, image_url || '', req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Fetch the updated product
    const [rows] = await pool.execute(
      'SELECT * FROM products WHERE id = ?',
      [req.params.id]
    );

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
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📱 API endpoints available at http://localhost:${PORT}/api`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
