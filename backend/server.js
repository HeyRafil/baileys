require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const db = require('./database');
const whatsapp = require('./whatsapp');

// Import routes
const authRoutes = require('./routes/auth');
const coursesRoutes = require('./routes/courses');
const historyRoutes = require('./routes/history');
const statsRoutes = require('./routes/stats');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: '*', // In production, refine to specific domains if needed
  credentials: true
}));

// Parsing Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global Rate Limiter for Web APIs (15 minutes, max 300 requests)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Terlalu banyak request dari IP Anda. Silakan coba lagi nanti.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limit for QR polling to prevent dashboard freezing
    return req.originalUrl.includes('/whatsapp-qr');
  }
});
app.use('/api/', apiLimiter);

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/settings', settingsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(500).json({ error: 'Terjadi kesalahan internal pada server' });
});

// Startup Function
async function startServer() {
  try {
    // 1. Initialize Database (SQLite/PostgreSQL)
    await db.initDatabase();

    // 2. Start Express Server
    app.listen(PORT, () => {
      console.log(`======================================================`);
      console.log(`Express Server running on port: ${PORT}`);
      console.log(`API URL: http://localhost:${PORT}/api`);
      console.log(`======================================================`);
    });

    // 3. Connect to WhatsApp (asynchronously)
    whatsapp.connectToWhatsApp().catch(err => {
      console.error('Failed to initialize WhatsApp bot:', err.message);
    });

  } catch (err) {
    console.error('Server startup failed:', err.message);
    process.exit(1);
  }
}

startServer();
