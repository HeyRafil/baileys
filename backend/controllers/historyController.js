const db = require('../database');
const ai = require('../ai');

// Get global academic questions history
exports.getHistory = async (req, res) => {
  const { search, mode, course_id } = req.query;

  try {
    let sql = `
      SELECT q.*, u.nama as student_name, u.whatsapp_number, u.nim,
             c.nama_matkul, c.kode_matkul
      FROM questions q
      JOIN users u ON q.user_id = u.id
      LEFT JOIN courses c ON q.course_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (search) {
      sql += ` AND (q.question LIKE $${paramIndex} OR q.answer LIKE $${paramIndex} OR u.nama LIKE $${paramIndex} OR u.nim LIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (mode) {
      sql += ` AND q.mode = $${paramIndex}`;
      params.push(mode);
      paramIndex++;
    }

    if (course_id) {
      sql += ` AND q.course_id = $${paramIndex}`;
      params.push(parseInt(course_id));
      paramIndex++;
    }

    sql += ` ORDER BY q.created_at DESC`;

    const result = await db.query(sql, params);
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('getHistory Error:', err.message);
    return res.status(500).json({ error: 'Gagal mengambil riwayat data' });
  }
};

// Ask AI directly from Web Dashboard Chat
exports.askQuestionWeb = async (req, res) => {
  const { question, mode, course_id } = req.body;
  const adminUser = req.user; // Decoder from JWT containing admin details

  if (!question || !mode) {
    return res.status(400).json({ error: 'Pertanyaan dan Mode (tugas/diskusi) wajib diisi' });
  }

  try {
    // 1. Get student profile details (we use the logged-in admin's profile or default info)
    const userRes = await db.query('SELECT * FROM users WHERE id = $1', [adminUser.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }
    const dbUser = userRes.rows[0];

    // 2. Fetch course context if course_id is provided
    let courseInfo = null;
    if (course_id) {
      const courseRes = await db.query('SELECT * FROM courses WHERE id = $1', [course_id]);
      if (courseRes.rows.length > 0) {
        courseInfo = courseRes.rows[0];
      }
    }

    // 3. Build context object
    const context = {
      nama_mahasiswa: dbUser.nama,
      nim_mahasiswa: dbUser.nim,
      prodi_mahasiswa: dbUser.prodi,
      nama_matkul: courseInfo ? courseInfo.nama_matkul : '-',
      kode_matkul: courseInfo ? courseInfo.kode_matkul : '-'
    };

    // 4. Invoke AI Generation
    const answer = await ai.generateAnswer(mode, question, context);

    // 5. Extract references from answer
    let referencesUsed = '';
    const refMatch = answer.match(/Referensi:\s*([\s\S]*)$/i);
    if (refMatch) {
      referencesUsed = refMatch[1].trim();
    }

    // 6. Save to questions table
    const insertRes = await db.query(
      'INSERT INTO questions (user_id, course_id, mode, question, answer, references_used) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [dbUser.id, course_id || null, mode, question, answer, referencesUsed]
    ).catch(async () => {
      // Fallback
      await db.query(
        'INSERT INTO questions (user_id, course_id, mode, question, answer, references_used) VALUES ($1, $2, $3, $4, $5, $6)',
        [dbUser.id, course_id || null, mode, question, answer, referencesUsed]
      );
      return await db.query('SELECT * FROM questions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [dbUser.id]);
    });

    const newQuestionRecord = insertRes.rows[0];

    return res.status(200).json({
      message: 'Berhasil memproses pertanyaan',
      data: {
        ...newQuestionRecord,
        student_name: dbUser.nama,
        nim: dbUser.nim,
        nama_matkul: courseInfo ? courseInfo.nama_matkul : '-',
        kode_matkul: courseInfo ? courseInfo.kode_matkul : '-'
      }
    });

  } catch (err) {
    console.error('askQuestionWeb Error:', err);
    return res.status(500).json({ error: `Gagal memproses pertanyaan: ${err.message}` });
  }
};

// Get chat logs per student (for Chat History per student list)
exports.getStudentHistory = async (req, res) => {
  const { student_id } = req.params;
  try {
    const resHistory = await db.query(
      `SELECT q.*, c.kode_matkul, c.nama_matkul 
       FROM questions q 
       LEFT JOIN courses c ON q.course_id = c.id 
       WHERE q.user_id = $1 
       ORDER BY q.created_at ASC`,
      [student_id]
    );
    return res.status(200).json(resHistory.rows);
  } catch (err) {
    console.error('getStudentHistory Error:', err.message);
    return res.status(500).json({ error: 'Gagal mengambil chat history mahasiswa' });
  }
};
