import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, Search, Plus, Trash2, Edit3, X, AlertCircle } from 'lucide-react';

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Form States
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [namaMatkul, setNamaMatkul] = useState('');
  const [kodeMatkul, setKodeMatkul] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchCourses = async () => {
    try {
      const response = await axios.get(`/api/courses?search=${search}`);
      setCourses(response.data);
    } catch (err) {
      console.error('Failed to fetch courses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!namaMatkul || !kodeMatkul) {
      setError('Nama Mata Kuliah dan Kode MK wajib diisi.');
      return;
    }

    try {
      if (isEditing) {
        await axios.put(`/api/courses/${editId}`, {
          nama_matkul: namaMatkul,
          kode_matkul: kodeMatkul,
          deskripsi
        });
        setSuccess('Mata kuliah berhasil diperbarui!');
      } else {
        await axios.post('/api/courses', {
          nama_matkul: namaMatkul,
          kode_matkul: kodeMatkul,
          deskripsi
        });
        setSuccess('Mata kuliah berhasil ditambahkan!');
      }

      resetForm();
      fetchCourses();
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menyimpan mata kuliah');
    }
  };

  const handleEdit = (course) => {
    setIsEditing(true);
    setEditId(course.id);
    setNamaMatkul(course.nama_matkul);
    setKodeMatkul(course.kode_matkul);
    setDeskripsi(course.deskripsi || '');
    setError('');
    setSuccess('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus mata kuliah ini?')) return;
    try {
      await axios.delete(`/api/courses/${id}`);
      setSuccess('Mata kuliah berhasil dihapus!');
      fetchCourses();
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menghapus mata kuliah');
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setNamaMatkul('');
    setKodeMatkul('');
    setDeskripsi('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold md:text-3xl text-slate-800 dark:text-white flex items-center gap-3">
          <BookOpen className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          Kelola Mata Kuliah
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
          Kelola bank mata kuliah terdaftar untuk mendukung pencocokan konteks AI mahasiswa.
        </p>
      </div>

      {/* Notifications */}
      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-2xl">
          {success}
        </div>
      )}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-2xl flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Create / Edit Form */}
        <div className="glass rounded-3xl p-6 shadow-md h-fit space-y-5">
          <div className="flex justify-between items-center">
            <h3 className="text-md font-bold text-slate-800 dark:text-white">
              {isEditing ? 'Edit Mata Kuliah' : 'Tambah Mata Kuliah Baru'}
            </h3>
            {isEditing && (
              <button 
                onClick={resetForm}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Kode Mata Kuliah
              </label>
              <input
                type="text"
                placeholder="Contoh: EKMA4369"
                value={kodeMatkul}
                onChange={(e) => setKodeMatkul(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Nama Mata Kuliah
              </label>
              <input
                type="text"
                placeholder="Contoh: Manajemen Operasi"
                value={namaMatkul}
                onChange={(e) => setNamaMatkul(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Deskripsi Singkat
              </label>
              <textarea
                rows={3}
                placeholder="Tulis deskripsi atau modul singkat..."
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-medium"
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md shadow-blue-500/10 transition-colors cursor-pointer"
            >
              {isEditing ? 'Simpan Perubahan' : 'Tambahkan Mata Kuliah'}
            </button>
          </form>
        </div>

        {/* Right Side: Courses Table & Search */}
        <div className="lg:col-span-2 glass rounded-3xl p-6 shadow-md space-y-4 flex flex-col h-[500px]">
          {/* Search Box */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder="Cari nama atau kode mata kuliah..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-semibold"
            />
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-slate-400 font-semibold animate-pulse">Memuat list...</p>
              </div>
            ) : courses.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-1">
                <BookOpen className="h-10 w-10 text-slate-300 dark:text-slate-800" />
                <p className="text-sm font-semibold">Tidak Ada Data</p>
                <p className="text-xs">Mata kuliah kosong atau tidak ditemukan.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {courses.map((course) => (
                  <div key={course.id} className="py-3 flex justify-between items-center gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400">
                          {course.kode_matkul}
                        </span>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-white truncate">
                          {course.nama_matkul}
                        </h4>
                      </div>
                      {course.deskripsi && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium truncate">
                          {course.deskripsi}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleEdit(course)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(course.id)}
                        className="p-1.5 rounded-lg border border-rose-100 dark:border-rose-950/20 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
