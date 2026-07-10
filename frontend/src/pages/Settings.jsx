import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings as SettingsIcon, Save, Download, AlertCircle, RefreshCw } from 'lucide-react';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  
  // Settings States
  const [provider, setProvider] = useState('gemini');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [tugasPrompt, setTugasPrompt] = useState('');
  const [diskusiPrompt, setDiskusiPrompt] = useState('');

  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/api/settings');
      const data = response.data;
      
      setProvider(data.ai_provider || 'gemini');
      setGeminiApiKey(data.gemini_api_key || '');
      setOpenaiApiKey(data.openai_api_key || '');
      setSystemPrompt(data.ai_system_prompt || '');
      setTugasPrompt(data.ai_tugas_prompt || '');
      setDiskusiPrompt(data.ai_diskusi_prompt || '');
    } catch (err) {
      setError('Gagal memuat konfigurasi dari database.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    setSuccess('');
    setError('');

    try {
      await axios.post('/api/settings', {
        ai_provider: provider,
        gemini_api_key: geminiApiKey,
        openai_api_key: openaiApiKey,
        ai_system_prompt: systemPrompt,
        ai_tugas_prompt: tugasPrompt,
        ai_diskusi_prompt: diskusiPrompt
      });
      setSuccess('Pengaturan berhasil disimpan ke database!');
      fetchSettings();
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menyimpan pengaturan.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    setSuccess('');
    setError('');

    try {
      // Trigger download backup JSON file
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/settings/backup', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ut_database_backup_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setSuccess('Backup database berhasil diunduh!');
    } catch (err) {
      setError('Gagal membuat backup database.');
      console.error(err);
    } finally {
      setBackupLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold md:text-3xl text-slate-800 dark:text-white flex items-center gap-3">
          <SettingsIcon className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          Pengaturan Sistem & AI
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
          Konfigurasikan kunci API AI provider, prompt behavior, dan backup database.
        </p>
      </div>

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
        {/* API Credentials */}
        <div className="glass rounded-3xl p-6 shadow-md h-fit space-y-4 lg:col-span-2">
          <h3 className="text-md font-bold text-slate-800 dark:text-white">
            Konfigurasi API AI Provider
          </h3>
          <form onSubmit={handleSave} className="space-y-5">
            {/* AI Provider */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                AI Provider Aktif
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-semibold"
              >
                <option value="gemini">Google Gemini Pro (Direkomendasikan)</option>
                <option value="openai">OpenAI (GPT-4o-mini)</option>
              </select>
            </div>

            {/* Gemini API Key */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Google Gemini API Key
              </label>
              <input
                type="password"
                placeholder="Masukkan API Key Gemini"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-semibold"
              />
            </div>

            {/* OpenAI API Key */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                OpenAI API Key (Opsional)
              </label>
              <input
                type="password"
                placeholder="Masukkan API Key OpenAI"
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-semibold"
              />
            </div>

            {/* System Prompt */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                System Prompt (AI Persona & Identity)
              </label>
              <textarea
                rows={4}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-medium"
              ></textarea>
            </div>

            {/* Tugas Prompt Template */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Template Mode Tugas (.tugas)
              </label>
              <textarea
                rows={4}
                value={tugasPrompt}
                onChange={(e) => setTugasPrompt(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs font-mono"
              ></textarea>
            </div>

            {/* Diskusi Prompt Template */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Template Mode Diskusi (.diskusi)
              </label>
              <textarea
                rows={4}
                value={diskusiPrompt}
                onChange={(e) => setDiskusiPrompt(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs font-mono"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={saveLoading}
              className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
            >
              {saveLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan Pengaturan
            </button>
          </form>
        </div>

        {/* Database Utilities */}
        <div className="glass rounded-3xl p-6 shadow-md h-fit space-y-4">
          <h3 className="text-md font-bold text-slate-800 dark:text-white">
            Peralatan Database
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            Gunakan modul utilitas di bawah ini untuk mendownload cadangan data database lengkap (users, courses, questions, logs, settings) dalam bentuk JSON yang aman dan portable.
          </p>

          <button
            onClick={handleBackup}
            disabled={backupLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {backupLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Backup Database
          </button>
        </div>
      </div>
    </div>
  );
}
