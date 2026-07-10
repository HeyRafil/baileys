const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwttokenkey123!@#';

exports.login = async (req, res) => {
  const { nim, password } = req.body;

  if (!nim || !password) {
    return res.status(400).json({ error: 'NIM dan Password wajib diisi' });
  }

  try {
    // 1. Fetch user by NIM
    const userRes = await db.query('SELECT * FROM users WHERE nim = $1', [nim]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'NIM atau Password salah' });
    }

    const user = userRes.rows[0];
    
    // 2. Validate role
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Akses ditolak. Anda bukan Administrator.' });
    }

    // 3. Fetch admin password hash from settings
    const pwdRes = await db.query('SELECT value FROM settings WHERE key = $1', ['admin_password_hash']);
    if (pwdRes.rows.length === 0) {
      return res.status(500).json({ error: 'Password hash admin belum di-seed.' });
    }

    const hash = pwdRes.rows[0].value;

    // 4. Verify password
    const isMatch = await bcrypt.compare(password, hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'NIM atau Password salah' });
    }

    // 5. Generate Token
    const token = jwt.sign(
      { id: user.id, nama: user.nama, role: user.role, nim: user.nim },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        nama: user.nama,
        nim: user.nim,
        role: user.role
      }
    });

  } catch (err) {
    console.error('Login Error:', err.message);
    return res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};

// Middleware to authenticate token
exports.authenticate = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token otentikasi tidak ditemukan' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token tidak valid atau kadaluwarsa' });
  }
};

// Middleware to authorize Admin role
exports.isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ error: 'Akses ditolak. Memerlukan role Admin.' });
  }
};
