const db = require('../database');

// Get all courses (with optional search)
exports.getCourses = async (req, res) => {
  const { search } = req.query;
  try {
    let result;
    if (search) {
      const searchParam = `%${search}%`;
      result = await db.query(
        'SELECT * FROM courses WHERE nama_matkul LIKE $1 OR kode_matkul LIKE $2 ORDER BY kode_matkul ASC',
        [searchParam, searchParam]
      );
    } else {
      result = await db.query('SELECT * FROM courses ORDER BY kode_matkul ASC');
    }
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('getCourses Error:', err.message);
    return res.status(500).json({ error: 'Gagal mengambil mata kuliah' });
  }
};

// Create a new course
exports.createCourse = async (req, res) => {
  const { nama_matkul, kode_matkul, deskripsi } = req.body;

  if (!nama_matkul || !kode_matkul) {
    return res.status(400).json({ error: 'Nama mata kuliah dan Kode MK wajib diisi' });
  }

  try {
    // Check if code exists
    const checkExist = await db.query('SELECT * FROM courses WHERE kode_matkul = $1', [kode_matkul]);
    if (checkExist.rows.length > 0) {
      return res.status(400).json({ error: 'Kode mata kuliah sudah terdaftar' });
    }

    const insertRes = await db.query(
      'INSERT INTO courses (nama_matkul, kode_matkul, deskripsi) VALUES ($1, $2, $3) RETURNING *',
      [nama_matkul, kode_matkul, deskripsi || '']
    ).catch(async () => {
      // Fallback
      await db.query('INSERT INTO courses (nama_matkul, kode_matkul, deskripsi) VALUES ($1, $2, $3)', [nama_matkul, kode_matkul, deskripsi || '']);
      return await db.query('SELECT * FROM courses WHERE kode_matkul = $1', [kode_matkul]);
    });

    const newCourse = insertRes.rows[0];
    return res.status(201).json({ message: 'Mata kuliah berhasil ditambahkan', course: newCourse });
  } catch (err) {
    console.error('createCourse Error:', err.message);
    return res.status(500).json({ error: 'Gagal menambahkan mata kuliah' });
  }
};

// Update a course
exports.updateCourse = async (req, res) => {
  const { id } = req.params;
  const { nama_matkul, kode_matkul, deskripsi } = req.body;

  if (!nama_matkul || !kode_matkul) {
    return res.status(400).json({ error: 'Nama mata kuliah dan Kode MK wajib diisi' });
  }

  try {
    // Check unique for code excluding current id
    const checkExist = await db.query('SELECT * FROM courses WHERE kode_matkul = $1 AND id != $2', [kode_matkul, id]);
    if (checkExist.rows.length > 0) {
      return res.status(400).json({ error: 'Kode mata kuliah sudah digunakan oleh mata kuliah lain' });
    }

    await db.query(
      'UPDATE courses SET nama_matkul = $1, kode_matkul = $2, deskripsi = $3 WHERE id = $4',
      [nama_matkul, kode_matkul, deskripsi || '', id]
    );

    return res.status(200).json({ message: 'Mata kuliah berhasil diperbarui' });
  } catch (err) {
    console.error('updateCourse Error:', err.message);
    return res.status(500).json({ error: 'Gagal memperbarui mata kuliah' });
  }
};

// Delete a course
exports.deleteCourse = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM courses WHERE id = $1', [id]);
    return res.status(200).json({ message: 'Mata kuliah berhasil dihapus' });
  } catch (err) {
    console.error('deleteCourse Error:', err.message);
    return res.status(500).json({ error: 'Gagal menghapus mata kuliah' });
  }
};
