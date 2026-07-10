import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import { 
  History as HistoryIcon, 
  Search, 
  Filter, 
  Copy, 
  Check, 
  FileText, 
  RefreshCw, 
  BookOpen, 
  MessageSquare,
  ChevronRight,
  User
} from 'lucide-react';

export default function History() {
  const [historyLogs, setHistoryLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState(''); // '' or 'tugas' or 'diskusi'
  const [loading, setLoading] = useState(true);
  
  const [copied, setCopied] = useState(false);

  const fetchHistory = async () => {
    try {
      const modeQuery = modeFilter ? `&mode=${modeFilter}` : '';
      const response = await axios.get(`/api/history?search=${search}${modeQuery}`);
      setHistoryLogs(response.data);
      if (response.data.length > 0 && !selectedLog) {
        setSelectedLog(response.data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [search, modeFilter]);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPDF = (log) => {
    if (!log) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    
    // Add PDF Header decoration
    doc.setFillColor(14, 144, 233);
    doc.rect(0, 0, pageWidth, 25, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('UT ACADEMIC LOG REPORT', 15, 16);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Bukti Analisis Jawaban Akademik - UT Academic Bot', 15, 21);

    // Metadata
    doc.setTextColor(60, 60, 60);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Rincian Mahasiswa & Mata Kuliah:', 15, 35);
    
    doc.setFont('Helvetica', 'normal');
    doc.text(`Nama Mahasiswa: ${log.student_name || '-'}`, 15, 41);
    doc.text(`NIM: ${log.nim || '-'}`, 15, 47);
    doc.text(`WhatsApp: ${log.whatsapp_number}`, 15, 53);
    doc.text(`Mode Jawaban: ${log.mode.toUpperCase()}`, 15, 59);
    
    const courseName = log.kode_matkul ? `${log.kode_matkul} - ${log.nama_matkul}` : 'Umum (Tidak Spesifik)';
    doc.text(`Mata Kuliah: ${courseName}`, 15, 65);
    doc.text(`Tanggal Tanya: ${new Date(log.created_at).toLocaleDateString('id-ID')}`, 15, 71);

    // Draw Line
    doc.setDrawColor(220, 220, 220);
    doc.line(15, 75, pageWidth - 15, 75);

    // Question
    doc.setFont('Helvetica', 'bold');
    doc.text('Pertanyaan:', 15, 83);
    doc.setFont('Helvetica', 'normal');
    
    const questionLines = doc.splitTextToSize(log.question, pageWidth - 30);
    doc.text(questionLines, 15, 89);
    
    const questionHeight = questionLines.length * 5;
    let nextY = 89 + questionHeight + 10;

    // Draw Line
    doc.line(15, nextY - 5, pageWidth - 15, nextY - 5);

    // Answer
    doc.setFont('Helvetica', 'bold');
    doc.text('Analisis & Jawaban AI:', 15, nextY);
    doc.setFont('Helvetica', 'normal');
    
    const answerLines = doc.splitTextToSize(log.answer, pageWidth - 30);
    
    let currentY = nextY + 6;
    for (let i = 0; i < answerLines.length; i++) {
      if (currentY > pageHeight - 20) {
        doc.addPage();
        currentY = 20;
      }
      doc.text(answerLines[i], 15, currentY);
      currentY += 6;
    }

    doc.save(`Laporan_UT_${log.nim || 'bot'}_${log.id}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold md:text-3xl text-slate-800 dark:text-white flex items-center gap-3">
          <HistoryIcon className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          Riwayat Pertanyaan Mahasiswa
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
          Audit seluruh histori pertanyaan yang diajukan mahasiswa via WhatsApp maupun portal web.
        </p>
      </div>

      {/* Filter and Search controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div className="md:col-span-2 relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="Cari NIM, nama mahasiswa, soal, jawaban..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-semibold"
          />
        </div>

        {/* Filter Mode */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Filter className="h-4 w-4" />
          </div>
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-semibold"
          >
            <option value="">Semua Mode</option>
            <option value="tugas">Mode Tugas</option>
            <option value="diskusi">Mode Diskusi</option>
          </select>
        </div>

        {/* Refresh */}
        <button
          onClick={fetchHistory}
          className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className="h-4 w-4" /> Segarkan List
        </button>
      </div>

      {/* Main Double-Panel Section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[500px]">
        {/* Left Panel: Logs List */}
        <div className="lg:col-span-2 glass rounded-3xl p-6 shadow-md flex flex-col h-full overflow-hidden">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
            Daftar Log Masuk
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-slate-400 font-semibold animate-pulse">Memuat riwayat...</p>
              </div>
            ) : historyLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-1">
                <HistoryIcon className="h-10 w-10 text-slate-300 dark:text-slate-800" />
                <p className="text-sm font-semibold">Tidak Ada Riwayat</p>
                <p className="text-xs">Log pertanyaan kosong.</p>
              </div>
            ) : (
              historyLogs.map((log) => {
                const isSelected = selectedLog && selectedLog.id === log.id;
                const courseCode = log.kode_matkul || 'UMUM';
                return (
                  <button
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                      isSelected
                        ? 'bg-blue-600/5 dark:bg-blue-600/10 border-blue-600/30'
                        : 'border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="min-w-0 space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-blue-100/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 uppercase">
                          {courseCode}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {new Date(log.created_at).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white truncate">
                        {log.student_name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold truncate leading-normal">
                        Q: "{log.question}"
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Detail Log Viewer */}
        <div className="lg:col-span-3 glass rounded-3xl p-6 shadow-md flex flex-col h-full overflow-hidden">
          {selectedLog ? (
            <div className="flex flex-col h-full space-y-4">
              {/* Detail Header */}
              <div className="flex justify-between items-start gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      selectedLog.mode === 'tugas'
                        ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400'
                        : 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
                    }`}>
                      Mode {selectedLog.mode}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      ID: {selectedLog.id}
                    </span>
                  </div>
                  <h3 className="text-md font-bold text-slate-800 dark:text-white truncate">
                    {selectedLog.student_name} ({selectedLog.nim || 'NIM -'})
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Mata Kuliah: {selectedLog.kode_matkul ? `[${selectedLog.kode_matkul}] ${selectedLog.nama_matkul}` : 'Umum'} | WA: {selectedLog.whatsapp_number}
                  </p>
                </div>

                {/* Exporters */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleCopy(selectedLog.answer)}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors"
                    title="Salin Jawaban"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleExportPDF(selectedLog)}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors"
                    title="Unduh Laporan PDF"
                  >
                    <FileText className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable details */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {/* Question Section */}
                <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/40">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Pertanyaan Mahasiswa:
                  </h4>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                    {selectedLog.question}
                  </p>
                </div>

                {/* Answer Section */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Hasil Jawaban AI:
                  </h4>
                  <div className="text-sm leading-relaxed whitespace-pre-line text-slate-700 dark:text-slate-300 font-medium">
                    {selectedLog.answer}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-6 space-y-1">
              <HistoryIcon className="h-10 w-10 text-slate-300 dark:text-slate-800" />
              <p className="text-sm font-semibold">Pilih Log Riwayat</p>
              <p className="text-xs">Klik salah satu riwayat pertanyaan di sebelah kiri untuk melihat rincian.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
