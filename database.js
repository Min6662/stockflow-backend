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

    // Check for sales table and create if it doesn't exist
    const [salesTables] = await connection.execute("SHOW TABLES LIKE 'sales'");
    
    if (salesTables.length === 0) {
      console.log('🔨 Creating sales table...');
      
      await connection.execute(`
        CREATE TABLE sales (
          id VARCHAR(255) PRIMARY KEY,
          timestamp DATETIME NOT NULL,
          items JSON NOT NULL,
          total_amount DECIMAL(10, 2) NOT NULL,
          payment_method VARCHAR(50) NOT NULL,
          customer_name VARCHAR(255) NULL,
          notes TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          user_id INT NULL
        )
      `);
      
      console.log('✅ Sales table created successfully!');
    } else {
      console.log('✅ Sales table found in database!');
      
      // Check sales table structure
      const [salesColumns] = await connection.execute('DESCRIBE sales');
      console.log('📋 Sales table columns:');
      salesColumns.forEach(col => {
        console.log(`   - ${col.Field} (${col.Type})`);
      });
      
      // Check sales record count
      const [salesCount] = await connection.execute('SELECT COUNT(*) as total FROM sales');
      console.log(`📊 Existing sales records: ${salesCount[0].total}`);
    }

    // Check for users table and create if it doesn't exist
    const [usersTables] = await connection.execute("SHOW TABLES LIKE 'users'");
    
    if (usersTables.length === 0) {
      console.log('🔨 Creating users table...');
      
      await connection.execute(`
        CREATE TABLE users (
          id INT PRIMARY KEY AUTO_INCREMENT,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'user',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      
      console.log('✅ Users table created successfully!');
    } else {
      console.log('✅ Users table found in database!');
      
      // Check users table structure
      const [usersColumns] = await connection.execute('DESCRIBE users');
      console.log('📋 Users table columns:');
      usersColumns.forEach(col => {
        console.log(`   - ${col.Field} (${col.Type})`);
      });
      
      // Check users record count
      const [usersCount] = await connection.execute('SELECT COUNT(*) as total FROM users');
      console.log(`📊 Existing users: ${usersCount[0].total}`);
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
