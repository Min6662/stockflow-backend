const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Connected to MySQL database successfully!');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Initialize database tables
async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();
    
    // Just verify the products table exists and show its structure
    const [tables] = await connection.execute("SHOW TABLES LIKE 'products'");
    
    if (tables.length > 0) {
      console.log('✅ Products table found in database!');
      
      // Check table structure
      const [columns] = await connection.execute('DESCRIBE products');
      console.log('📋 Table columns available:');
      columns.forEach(col => {
        console.log(`   - ${col.Field} (${col.Type})`);
      });
      
      // Check record count
      const [count] = await connection.execute('SELECT COUNT(*) as total FROM products');
      console.log(`📊 Existing records: ${count[0].total}`);
      
    } else {
      console.log('❌ Products table not found in database!');
    }
    
    connection.release();
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
  }
}

module.exports = {
  pool,
  testConnection,
  initializeDatabase
};
