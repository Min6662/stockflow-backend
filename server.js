const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { pool, testConnection, initializeDatabase } = require('./database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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
