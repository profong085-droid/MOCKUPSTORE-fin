const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Vercel serverless functions only allow writing to /tmp
const dbPath = process.env.VERCEL ? '/tmp/mockupstore.db' : path.resolve(__dirname, 'mockupstore.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
  } else {
    console.log('✅ Connected to the SQLite database.');
    
    // បង្កើតតារាង (Table) សម្រាប់ផ្ទុកទិន្នន័យការកម្ម៉ង់ (Orders)
    db.run(`CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderNumber TEXT UNIQUE,
      totalAmount REAL,
      paymentMethod TEXT,
      paymentStatus TEXT,
      itemsData TEXT,
      userEmail TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Add userEmail column if it doesn't exist (for existing databases)
    db.run(`ALTER TABLE orders ADD COLUMN userEmail TEXT`, (err) => {
      // Ignore error if column already exists
    });
  }
});

module.exports = db;
