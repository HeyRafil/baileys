import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, HelpCircle, Bot, AlertTriangle, ArrowUpRight, CheckCircle2, RefreshCw } from 'lucide-react';
import StatsCard from '../components/StatsCard.jsx';
import QRModal from '../components/QRModal.jsx';

export default function Dashboard({ setCurrentPage }) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalQuestions: 0,
    modeDistribution: { tugas: 0, diskusi: 0 },
    dailyUsage: []
  });
  const [bot, setBot] = useState({ status: 'disconnected', hasQR: false });
  const [qrCode, setQrCode] = useState(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/api/stats');
      setStats(response.data.stats);
      setBot(response.data.bot);
    } catch (err) {
      console.error('Failed to fetch dashboard statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWhatsAppQR = async () => {
    try {
      const response = await axios.get('/api/settings/whatsapp-qr');
      setBot(prev => ({ ...prev, status: response.data.status, hasQR: !!response.data.qr }));
      setQrCode(response.data.qr);
      
      // If bot gets connected while scanning, automatically close modal
      if (response.data.status === 'connected') {
        setIsQRModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to fetch QR:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Poll stats occasionally
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, []);

  // Poll QR code & status frequently when the modal is open
  useEffect(() => {
    let qrInterval;
    if (isQRModalOpen) {
      fetchWhatsAppQR();
      qrInterval = setInterval(fetchWhatsAppQR, 4000);
    }
    return () => {
      if (qrInterval) clearInterval(qrInterval);
    };
  }, [isQRModalOpen]);

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold md:text-3xl text-slate-800 dark:text-white">
            Selamat Datang di Portal UT AI
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
            Pantau performa asisten WhatsApp AI dan interaksi mahasiswa.
          </p>
        </div>

        <button
          onClick={fetchDashboardData}
          className="flex items-center gap-2 py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className="h-4 w-4" /> Segarkan
        </button>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Total Pengguna" 
          value={stats.totalUsers} 
          icon={Users} 
          description="Mahasiswa terdaftar di database"
          colorClass="blue"
        />
        <StatsCard 
          title="Pertanyaan Dijawab" 
          value={stats.totalQuestions} 
          icon={HelpCircle} 
          description="Akumulasi seluruh mode AI"
          colorClass="green"
        />
        <StatsCard 
          title="Mode Tugas" 
          value={stats.modeDistribution.tugas} 
          icon={ArrowUpRight} 
          description="Pertanyaan format tugas kuliah"
          colorClass="indigo"
        />
        <StatsCard 
          title="Mode Diskusi" 
          value={stats.modeDistribution.diskusi} 
          icon={ArrowUpRight} 
          description="Jawaban gaya forum diskusi"
          colorClass="rose"
        />
      </div>

      {/* Bot Status Panel & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bot Status Card */}
        <div className="glass rounded-3xl p-6 shadow-md flex flex-col justify-between space-y-6 lg:col-span-2">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Integrasi WhatsApp Bot
            </h3>
            
            {bot.status === 'connected' ? (
              <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-400">
                    Bot Aktif & Terhubung
                  </h4>
                  <p className="text-xs text-emerald-600 dark:text-emerald-500 font-medium">
                    Bot WhatsApp siap merespon pertanyaan mahasiswa di nomor Anda.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl">
                <AlertTriangle className="h-6 w-6 text-rose-600 dark:text-rose-400 animate-pulse" />
                <div>
                  <h4 className="text-sm font-bold text-rose-800 dark:text-rose-400">
                    Bot Terputus
                  </h4>
                  <p className="text-xs text-rose-600 dark:text-rose-500 font-medium">
                    Pindai QR Code untuk menghubungkan nomor WhatsApp bot ke server.
                  </p>
                </div>
              </div>
            )}
            
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              Aplikasi menggunakan library *Baileys* untuk mensimulasikan koneksi WhatsApp Web secara mandiri. Anda tidak perlu menyalakan HP terus-menerus setelah QR berhasil terscan.
            </p>
          </div>

          <div>
            {bot.status === 'connected' ? (
              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Sambungan Aman Terjaga
              </div>
            ) : (
              <button
                onClick={() => setIsQRModalOpen(true)}
                className="py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
              >
                Scan QR Code Sambungan
              </button>
            )}
          </div>
        </div>

        {/* Quick Help & Shortcuts */}
        <div className="glass rounded-3xl p-6 shadow-md flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
              Shortcut Cepat
            </h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Kemudahan Administrasi
            </p>
            <div className="space-y-2">
              <button 
                onClick={() => setCurrentPage('chat')} 
                className="w-full flex justify-between items-center px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-colors"
              >
                <span>Halaman Chat / Testing AI</span>
                <ArrowUpRight className="h-4 w-4 text-slate-400" />
              </button>
              <button 
                onClick={() => setCurrentPage('courses')} 
                className="w-full flex justify-between items-center px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-colors"
              >
                <span>Kelola Mata Kuliah</span>
                <ArrowUpRight className="h-4 w-4 text-slate-400" />
              </button>
              <button 
                onClick={() => setCurrentPage('settings')} 
                className="w-full flex justify-between items-center px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-colors"
              >
                <span>Pengaturan Kunci API & Prompt</span>
                <ArrowUpRight className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            UT Academic AI v1.0.0
          </div>
        </div>
      </div>

      {/* QR Authentication Modal */}
      <QRModal 
        isOpen={isQRModalOpen} 
        onClose={() => setIsQRModalOpen(false)} 
        qrCode={qrCode}
        botStatus={bot.status}
        onRefresh={fetchWhatsAppQR}
      />
    </div>
  );
}
