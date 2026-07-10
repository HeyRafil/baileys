import React from 'react';
import { X, RefreshCw, Smartphone } from 'lucide-react';

export default function QRModal({ isOpen, onClose, qrCode, botStatus, onRefresh }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-fade-in">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Hubungkan WhatsApp Bot
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center justify-center text-center space-y-6">
          <div className="space-y-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
              botStatus === 'connected' 
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400'
                : botStatus === 'connecting'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400'
                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400'
            }`}>
              Status: {botStatus}
            </span>
          </div>

          {/* QR Code Container */}
          <div className="relative h-64 w-64 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950 p-4 flex items-center justify-center shadow-inner">
            {qrCode ? (
              <img 
                src={qrCode} 
                alt="WhatsApp QR Code" 
                className="h-full w-full object-contain select-none"
              />
            ) : (
              <div className="flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="h-10 w-10 text-blue-600 dark:text-blue-400 animate-spin" />
                <p className="text-xs text-slate-400 font-semibold">
                  Memuat QR Code baru...
                </p>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="text-left w-full bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl space-y-2 border border-slate-100 dark:border-slate-800/60">
            <h4 className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Cara Menghubungkan:
            </h4>
            <ol className="text-xs text-slate-500 dark:text-slate-400 list-decimal list-inside space-y-1">
              <li>Buka aplikasi WhatsApp di HP Anda.</li>
              <li>Ketuk *Menu* atau *Pengaturan* (ikon titik tiga).</li>
              <li>Pilih *Perangkat Tertaut* (Linked Devices).</li>
              <li>Ketuk *Tautkan Perangkat*.</li>
              <li>Arahkan kamera HP Anda ke QR Code di atas.</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-950/30 px-6 py-4 flex justify-between gap-3 border-t border-slate-100 dark:border-slate-800/60">
          <button
            onClick={onRefresh}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> Refresh QR
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-500/20 dark:shadow-blue-600/10 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
