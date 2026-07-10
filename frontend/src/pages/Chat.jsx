import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import { 
  MessageSquare, 
  Send, 
  Copy, 
  Share2, 
  FileText, 
  Check, 
  RefreshCw, 
  GraduationCap 
} from 'lucide-react';

export default function Chat() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [mode, setMode] = useState('tugas'); // 'tugas' or 'diskusi'
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  // Fetch courses list for selecting course context
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await axios.get('/api/courses');
        setCourses(res.data);
      } catch (err) {
        console.error('Failed to fetch courses:', err);
      }
    };
    fetchCourses();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setAnswer('');
    
    try {
      const response = await axios.post('/api/history/ask', {
        question,
        mode,
        course_id: selectedCourse || null
      });
      setAnswer(response.data.data.answer);
    } catch (err) {
      console.error(err);
      setAnswer(`❌ Gagal memproses: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    const shareText = `*Jawaban Akademik UT AI [Mode: ${mode.toUpperCase()}]*\n\n${answer}`;
    navigator.clipboard.writeText(shareText);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  const handleExportPDF = () => {
    if (!answer) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    
    // Add PDF Header decoration
    doc.setFillColor(14, 144, 233); // brand-500 color
    doc.rect(0, 0, pageWidth, 25, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('UT ACADEMIC ASSISTANT AI', 15, 16);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Asisten Akademik Virtual Mahasiswa Universitas Terbuka', 15, 21);

    // Metadata
    doc.setTextColor(60, 60, 60);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Rincian Jawaban Soal:', 15, 35);
    
    doc.setFont('Helvetica', 'normal');
    doc.text(`Mode Jawaban: ${mode.toUpperCase()}`, 15, 41);
    
    // Find course name if exists
    const courseObj = courses.find(c => String(c.id) === String(selectedCourse));
    const courseName = courseObj ? `${courseObj.kode_matkul} - ${courseObj.nama_matkul}` : 'Umum (Tidak Spesifik)';
    doc.text(`Mata Kuliah: ${courseName}`, 15, 47);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 15, 53);

    // Draw Line
    doc.setDrawColor(220, 220, 220);
    doc.line(15, 57, pageWidth - 15, 57);

    // Question
    doc.setFont('Helvetica', 'bold');
    doc.text('Pertanyaan:', 15, 65);
    doc.setFont('Helvetica', 'normal');
    
    const questionLines = doc.splitTextToSize(question, pageWidth - 30);
    doc.text(questionLines, 15, 71);
    
    const questionHeight = questionLines.length * 5;
    let nextY = 71 + questionHeight + 10;

    // Draw Line
    doc.line(15, nextY - 5, pageWidth - 15, nextY - 5);

    // Answer
    doc.setFont('Helvetica', 'bold');
    doc.text('Hasil Jawaban & Analisis:', 15, nextY);
    doc.setFont('Helvetica', 'normal');
    
    const answerLines = doc.splitTextToSize(answer, pageWidth - 30);
    
    let currentY = nextY + 6;
    for (let i = 0; i < answerLines.length; i++) {
      if (currentY > pageHeight - 20) {
        doc.addPage();
        currentY = 20; // reset margin on new page
      }
      doc.text(answerLines[i], 15, currentY);
      currentY += 6;
    }

    // Save PDF
    doc.save(`Jawaban_UT_${mode}_${Date.now()}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold md:text-3xl text-slate-800 dark:text-white flex items-center gap-3">
          <MessageSquare className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          Halaman Chat & Testing AI
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
          Simulasikan pertanyaan mahasiswa dan lihat format keluaran asisten akademik AI.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Side: Question Input Form */}
        <div className="lg:col-span-2 glass rounded-3xl p-6 shadow-md h-fit space-y-6">
          <h3 className="text-md font-bold text-slate-800 dark:text-white">
            Konfigurasi Pertanyaan
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Mode Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Mode Jawaban AI
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('tugas')}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all border ${
                    mode === 'tugas'
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/10'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  Mode Tugas
                </button>
                <button
                  type="button"
                  onClick={() => setMode('diskusi')}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all border ${
                    mode === 'diskusi'
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/10'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  Mode Diskusi
                </button>
              </div>
            </div>

            {/* Course Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Hubungkan Mata Kuliah (Konteks)
              </label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-semibold"
              >
                <option value="">-- Tanpa Hubungan Mata Kuliah --</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    [{c.kode_matkul}] {c.nama_matkul}
                  </option>
                ))}
              </select>
            </div>

            {/* Question Text Area */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Pertanyaan / Soal Kuliah
              </label>
              <textarea
                rows={6}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Tulis soal atau topik diskusi di sini..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-medium"
              ></textarea>
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 font-bold text-sm shadow-lg shadow-blue-500/20 dark:shadow-none transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Menganalisis Soal...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Kirim ke AI</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Side: AI Response Screen */}
        <div className="lg:col-span-3 flex flex-col glass rounded-3xl p-6 shadow-md h-[550px]">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <h3 className="text-md font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Keluaran Respon AI
            </h3>
            
            {answer && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors"
                  title="Salin Jawaban"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </button>
                <button
                  onClick={handleShare}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors"
                  title="Share format WA"
                >
                  {shared ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
                </button>
                <button
                  onClick={handleExportPDF}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors"
                  title="Ekspor PDF"
                >
                  <FileText className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Answer Area */}
          <div className="flex-1 overflow-y-auto mt-4 pr-1">
            {answer ? (
              <div className="text-sm leading-relaxed whitespace-pre-line text-slate-700 dark:text-slate-300 font-medium">
                {answer}
              </div>
            ) : loading ? (
              <div className="h-full flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin" />
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  Sedang Merumuskan Jawaban Terbaik...
                </p>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-6 space-y-2">
                <MessageSquare className="h-12 w-12 text-slate-300 dark:text-slate-700" />
                <p className="text-sm font-semibold">Belum Ada Jawaban</p>
                <p className="text-xs max-w-xs leading-relaxed font-medium">
                  Konfigurasikan mata kuliah, masukkan pertanyaan di panel sebelah kiri, dan klik "Kirim ke AI" untuk melihat hasil analisis.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
