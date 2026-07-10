const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

let dbType = 'sqlite'; // 'postgres' or 'sqlite'
let pgPool = null;
let sqliteDb = null;

// Initialize configurations
const usePostgres = process.env.USE_POSTGRES === 'true';
const dbUrl = process.env.DATABASE_URL;

async function initDatabase() {
  if (usePostgres && dbUrl) {
    try {
      console.log('Connecting to PostgreSQL database...');
      pgPool = new Pool({
        connectionString: dbUrl,
        ssl: dbUrl.includes('supabase') ? { rejectUnauthorized: false } : false
      });
      // Test the connection
      await pgPool.query('SELECT NOW()');
      dbType = 'postgres';
      console.log('Successfully connected to PostgreSQL.');
      await createTablesPostgres();
    } catch (err) {
      console.error('Failed to connect to PostgreSQL. Falling back to SQLite...', err.message);
      await initSQLite();
    }
  } else {
    console.log('Using SQLite fallback database.');
    await initSQLite();
  }
  
  await seedAdminUser();
}

async function initSQLite() {
  dbType = 'sqlite';
  const dbPath = path.join(__dirname, 'database.db');
  
  return new Promise((resolve, reject) => {
    sqliteDb = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening SQLite database:', err.message);
        reject(err);
      } else {
        console.log('SQLite database opened successfully at:', dbPath);
        createTablesSQLite().then(resolve).catch(reject);
      }
    });
  });
}

// Create tables for PostgreSQL
async function createTablesPostgres() {
  const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await pgPool.query(schema);
  console.log('PostgreSQL tables verified/created.');
}

// Create tables for SQLite
async function createTablesSQLite() {
  const queries = [
    `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nama TEXT NOT NULL,
        nim TEXT UNIQUE,
        prodi TEXT,
        whatsapp_number TEXT UNIQUE NOT NULL,
        role TEXT DEFAULT 'member',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nama_matkul TEXT NOT NULL,
        kode_matkul TEXT UNIQUE NOT NULL,
        deskripsi TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
        mode TEXT NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        references_used TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS bot_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        whatsapp_number TEXT NOT NULL,
        command TEXT,
        message TEXT,
        response TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  for (const q of queries) {
    await new Promise((resolve, reject) => {
      sqliteDb.run(q, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
  console.log('SQLite tables verified/created.');
}

// Seed admin user
async function seedAdminUser() {
  const adminNim = process.env.ADMIN_NIM || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'adminpassword123';
  const adminName = process.env.ADMIN_NAME || 'Administrator UT Academic';
  const adminWa = process.env.ADMIN_WHATSAPP || '6281234567890';
  
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  
  // Check if admin user exists in users table (role = 'admin')
  const userCheck = await query('SELECT * FROM users WHERE nim = $1 OR whatsapp_number = $2', [adminNim, adminWa]);
  
  if (userCheck.rows.length === 0) {
    console.log('Seeding initial admin user...');
    await query(
      'INSERT INTO users (nama, nim, prodi, whatsapp_number, role) VALUES ($1, $2, $3, $4, $5)',
      [adminName, adminNim, 'Teknologi Informasi', adminWa, 'admin']
    );
    // Store credentials hashed or custom keys in settings table
    await query(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value',
      ['admin_password_hash', hashedPassword]
    ).catch(async () => {
      // For SQLite where ON CONFLICT syntax differs or settings key exists
      await query('INSERT OR REPLACE INTO settings (key, value) VALUES ($1, $2)', ['admin_password_hash', hashedPassword]);
    });
    console.log(`Admin user seeded successfully. NIM: ${adminNim}, Password: ${adminPassword}`);
  } else {
    // Update password hash in settings if admin already exists
    const adminUser = userCheck.rows.find(r => r.role === 'admin');
    if (adminUser) {
      await query('INSERT OR REPLACE INTO settings (key, value) VALUES ($1, $2)', ['admin_password_hash', hashedPassword]).catch(() => {
        // PG format
        query('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value', ['admin_password_hash', hashedPassword]);
      });
    }
  }
}

// Unified Query Function
// Replaces PG format parameters ($1, $2) with SQLite format (?) if SQLite is used
function query(text, params = []) {
  if (dbType === 'postgres') {
    return pgPool.query(text, params);
  } else {
    // Translate PG query parameter format ($1, $2...) to SQLite (?)
    let sqliteText = text;
    // Replace postgres specific phrases if any
    sqliteText = sqliteText.replace(/ON CONFLICT\s*\(\s*key\s*\)\s*DO\s*UPDATE\s*SET\s*value\s*=\s*EXCLUDED\.value/i, '');
    sqliteText = sqliteText.replace(/\$\d+/g, '?');
    
    return new Promise((resolve, reject) => {
      // Determine if it is a SELECT query or modifying query
      const isSelect = sqliteText.trim().match(/^select/i);
      
      if (isSelect) {
        sqliteDb.all(sqliteText, params, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve({ rows });
          }
        });
      } else {
        sqliteDb.run(sqliteText, params, function (err) {
          if (err) {
            reject(err);
          } else {
            // Mock pg returning response
            resolve({ 
              rows: [], 
              rowCount: this.changes, 
              lastID: this.lastID 
            });
          }
        });
      }
    });
  }
}

module.exports = {
  initDatabase,
  query,
  getDbType: () => dbType
};
