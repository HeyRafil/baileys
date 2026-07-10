const db = require('../database');
const whatsapp = require('../whatsapp');
const path = require('path');
const fs = require('fs');

// Fetch all settings
exports.getSettings = async (req, res) => {
  try {
    const dbRes = await db.query('SELECT key, value FROM settings');
    const config = {};
    dbRes.rows.forEach(r => {
      // Don't leak admin password hash to frontend
      if (r.key !== 'admin_password_hash') {
        config[r.key] = r.value;
      }
    });

    // Also inject some environment settings if not set in DB
    config.ai_provider = config.ai_provider || process.env.AI_PROVIDER || 'gemini';
    config.gemini_api_key = config.gemini_api_key || process.env.GEMINI_API_KEY || '';
    config.openai_api_key = config.openai_api_key || process.env.OPENAI_API_KEY || '';
    
    return res.status(200).json(config);
  } catch (err) {
    console.error('getSettings Error:', err.message);
    return res.status(500).json({ error: 'Gagal mengambil pengaturan' });
  }
};

// Save settings
exports.saveSettings = async (req, res) => {
  const settingsData = req.body;
  try {
    for (const [key, val] of Object.entries(settingsData)) {
      if (key === 'admin_password_hash') continue; // Do not allow manual hash injection
      
      // Upsert query for PostgreSQL and SQLite
      await db.query(
        'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value',
        [key, String(val)]
      ).catch(async () => {
        // SQLite upsert
        await db.query('INSERT OR REPLACE INTO settings (key, value) VALUES ($1, $2)', [key, String(val)]);
      });
    }

    return res.status(200).json({ message: 'Pengaturan berhasil disimpan' });
  } catch (err) {
    console.error('saveSettings Error:', err.message);
    return res.status(500).json({ error: 'Gagal menyimpan pengaturan' });
  }
};

// Get WhatsApp QR and Connection status
exports.getWhatsAppQR = async (req, res) => {
  try {
    const status = whatsapp.getStatus();
    const qr = whatsapp.getQR();
    return res.status(200).json({ status, qr });
  } catch (err) {
    console.error('getWhatsAppQR Error:', err.message);
    return res.status(500).json({ error: 'Gagal mendapatkan status WhatsApp' });
  }
};

// Backup Database (Generates a clean JSON dump containing all tables data)
exports.backupDatabase = async (req, res) => {
  try {
    console.log('Triggering database backup...');
    
    // Read all tables
    const users = await db.query('SELECT * FROM users');
    const courses = await db.query('SELECT * FROM courses');
    const questions = await db.query('SELECT * FROM questions');
    const botLogs = await db.query('SELECT * FROM bot_logs');
    const settings = await db.query('SELECT * FROM settings');

    const backupData = {
      timestamp: new Date().toISOString(),
      database_type: db.getDbType(),
      data: {
        users: users.rows,
        courses: courses.rows,
        questions: questions.rows,
        bot_logs: botLogs.rows,
        settings: settings.rows
      }
    };

    const fileName = `ut_backup_${Date.now()}.json`;
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    return res.status(200).send(JSON.stringify(backupData, null, 2));

  } catch (err) {
    console.error('backupDatabase Error:', err.message);
    return res.status(500).json({ error: 'Gagal membuat backup database' });
  }
};
