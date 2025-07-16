#!/bin/bash

echo "🧪 Testing Database Connection"
echo "=============================="

# Test the database connection from local machine
echo "📡 Testing connection to your database..."

# Create a simple test script
cat > test_db_connection.js << 'JSEOF'
const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    console.log('🔗 Connecting to database...');
    
    const connection = await mysql.createConnection({
      host: '154.90.45.217',
      user: 'Min',
      password: 'Min-591424',
      database: 'Mindb',
      port: 3306
    });

    console.log('✅ Database connection successful!');
    
    // Test a simple query
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Database query test successful:', rows);
    
    // Check if products table exists
    try {
      const [tables] = await connection.execute("SHOW TABLES LIKE 'products'");
      if (tables.length > 0) {
        console.log('✅ Products table exists');
        
        // Get table structure
        const [structure] = await connection.execute('DESCRIBE products');
        console.log('📋 Products table structure:');
        structure.forEach(col => {
          console.log(`   ${col.Field}: ${col.Type}`);
        });
      } else {
        console.log('⚠️  Products table does not exist - will be created on first run');
      }
    } catch (err) {
      console.log('⚠️  Products table check failed:', err.message);
    }
    
    await connection.end();
    console.log('✅ All database tests passed!');
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);
    
    if (error.code === 'ENOTFOUND') {
      console.error('   🔍 DNS resolution failed - check hostname');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   🔍 Connection refused - check if MySQL is running');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('   🔍 Access denied - check username/password');
    }
  }
}

testConnection();
JSEOF

# Check if mysql2 is installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🧪 Running database connection test..."
node test_db_connection.js

# Clean up
rm -f test_db_connection.js

echo ""
echo "📊 Database Test Complete!"
echo ""
echo "🚀 If the test passed, your Render deployment should work perfectly!"
echo "🔄 If the test failed, check your database server status and credentials."
