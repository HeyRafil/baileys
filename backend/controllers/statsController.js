const db = require('../database');
const whatsapp = require('../whatsapp');

exports.getDashboardStats = async (req, res) => {
  try {
    // 1. Total users
    const usersCount = await db.query('SELECT COUNT(*) as count FROM users');
    const totalUsers = parseInt(usersCount.rows[0].count);

    // 2. Total questions
    const questionsCount = await db.query('SELECT COUNT(*) as count FROM questions');
    const totalQuestions = parseInt(questionsCount.rows[0].count);

    // 3. Questions split by mode
    const modeCount = await db.query('SELECT mode, COUNT(*) as count FROM questions GROUP BY mode');
    const modes = { tugas: 0, diskusi: 0 };
    modeCount.rows.forEach(r => {
      modes[r.mode] = parseInt(r.count);
    });

    // 4. Questions per day (last 7 days) for chart
    let dailyStatsQuery = '';
    if (db.getDbType() === 'postgres') {
      dailyStatsQuery = `
        SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, COUNT(*) as count 
        FROM questions 
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
        ORDER BY date ASC
      `;
    } else {
      // SQLite
      dailyStatsQuery = `
        SELECT strftime('%Y-%m-%d', created_at) as date, COUNT(*) as count 
        FROM questions 
        WHERE created_at >= date('now', '-7 days')
        GROUP BY date
        ORDER BY date ASC
      `;
    }
    
    const dailyStatsRes = await db.query(dailyStatsQuery);
    const dailyStats = dailyStatsRes.rows.map(r => ({
      date: r.date,
      count: parseInt(r.count)
    }));

    // 5. Bot WhatsApp Connection status
    const botStatus = whatsapp.getStatus();
    const hasQR = !!whatsapp.getQR();

    return res.status(200).json({
      stats: {
        totalUsers,
        totalQuestions,
        modeDistribution: modes,
        dailyUsage: dailyStats
      },
      bot: {
        status: botStatus,
        hasQR
      }
    });

  } catch (err) {
    console.error('getDashboardStats Error:', err.message);
    return res.status(500).json({ error: 'Gagal mengambil statistik dashboard' });
  }
};
