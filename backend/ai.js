const { GoogleGenAI } = require('@google/generative-ai');
const db = require('./database');

// Default Prompt Templates
const DEFAULT_SYSTEM_PROMPT = `Kamu adalah AI Asisten Akademik mahasiswa Universitas Terbuka (UT).
Tugas kamu membantu menjawab soal kuliah dengan bahasa akademik yang mudah dipahami.
Jangan memberikan jawaban asal.
Analisa pertanyaan sebelum menjawab.
Gunakan referensi terpercaya.
Jika informasi tidak cukup, jelaskan keterbatasannya.`;

const DEFAULT_TUGAS_PROMPT = `Anda sedang berada di mode: TUGAS KULIAH.
Jawablah pertanyaan/soal tugas kuliah berikut ini.
Gunakan data konteks mahasiswa dan mata kuliah jika disediakan di bawah ini untuk memahami konteks.

Konteks Mahasiswa:
- Nama: {nama_mahasiswa}
- NIM: {nim_mahasiswa}
- Program Studi: {prodi_mahasiswa}

Konteks Mata Kuliah:
- Mata Kuliah: {nama_matkul}
- Kode MK: {kode_matkul}

Pertanyaan Soal:
{pertanyaan}

PENTING:
Wajib memberikan output dalam format bahasa Indonesia yang terstruktur dan rapi sesuai format berikut secara eksplisit:

Judul: [Tulis judul jawaban yang relevan]
Analisis: [Tulis analisis soal dan apa yang ditanyakan]
Jawaban: [Tulis jawaban lengkap dari pertanyaan]
Penjelasan: [Tulis penjelasan langkah demi langkah secara mendalam]
Kesimpulan: [Tulis kesimpulan singkat dari jawaban]
Referensi: [Tulis referensi akademik valid dan terpercaya. Contoh format: Buku Materi Pokok (BMP) UT, Jurnal Ilmiah, Buku Teks Akademik Resmi. Jika tidak menemukan sumber pasti atau ragu, tuliskan HANYA kalimat: "Referensi perlu diverifikasi kembali."]

Jangan menambahkan teks lain di luar format tersebut.`;

const DEFAULT_DISKUSI_PROMPT = `Anda sedang berada di mode: FORUM DISKUSI MAHASISWA.
Jawablah topik diskusi kuliah berikut. Gunakan bahasa Indonesia yang natural, mengalir, sopan, namun tetap akademis seperti seorang mahasiswa pintar yang sedang aktif berdiskusi di forum UT.

Konteks Mahasiswa:
- Nama: {nama_mahasiswa}
- NIM: {nim_mahasiswa}
- Program Studi: {prodi_mahasiswa}

Konteks Mata Kuliah:
- Mata Kuliah: {nama_matkul}
- Kode MK: {kode_matkul}

Topik Diskusi:
{pertanyaan}

PENTING:
Wajib memberikan output dalam format terstruktur berikut secara eksplisit:

Pembukaan Pendapat: [Kalimat pembuka diskusi yang sopan dan natural, contoh: "Selamat pagi/siang rekan-rekan dan tutor. Menurut pendapat saya..."]
Penjelasan Konsep: [Penjelasan konsep teori dasar akademik yang relevan dengan topik]
Contoh Penerapan: [Berikan contoh riil penerapan konsep di kehidupan nyata/industri]
Pendapat Pribadi Akademik: [Opini atau argumen kritis pribadi yang didasarkan pada landasan teori]
Referensi: [Tulis daftar referensi akademik pendukung yang valid (Buku BMP UT, Jurnal, Modul). Jika tidak menemukan sumber pasti, tuliskan HANYA kalimat: "Referensi perlu diverifikasi kembali."]

Jangan menambahkan teks lain di luar format tersebut.`;

// Get a setting key from database or fallback to env
async function getSetting(key, fallback) {
  try {
    const res = await db.query('SELECT value FROM settings WHERE key = $1', [key]);
    if (res.rows.length > 0) {
      return res.rows[0].value;
    }
  } catch (err) {
    console.warn(`Failed to fetch setting ${key} from DB, using fallback.`, err.message);
  }
  return fallback;
}

// Abstract AI Generation Function
async function generateAnswer(mode, question, context = {}) {
  // Retrieve settings
  const provider = await getSetting('ai_provider', process.env.AI_PROVIDER || 'gemini');
  const geminiApiKey = await getSetting('gemini_api_key', process.env.GEMINI_API_KEY || '');
  const openaiApiKey = await getSetting('openai_api_key', process.env.OPENAI_API_KEY || '');
  
  const systemPrompt = await getSetting('ai_system_prompt', DEFAULT_SYSTEM_PROMPT);
  
  let templatePrompt = '';
  if (mode === 'tugas') {
    templatePrompt = await getSetting('ai_tugas_prompt', DEFAULT_TUGAS_PROMPT);
  } else {
    templatePrompt = await getSetting('ai_diskusi_prompt', DEFAULT_DISKUSI_PROMPT);
  }

  // Format templates with context data
  let formattedPrompt = templatePrompt
    .replace('{nama_mahasiswa}', context.nama_mahasiswa || 'Mahasiswa UT')
    .replace('{nim_mahasiswa}', context.nim_mahasiswa || '-')
    .replace('{prodi_mahasiswa}', context.prodi_mahasiswa || '-')
    .replace('{nama_matkul}', context.nama_matkul || '-')
    .replace('{kode_matkul}', context.kode_matkul || '-')
    .replace('{pertanyaan}', question);

  const fullPrompt = `${systemPrompt}\n\n${formattedPrompt}`;

  if (provider === 'gemini') {
    if (!geminiApiKey) {
      throw new Error('Gemini API Key is not set. Please configure it in Settings.');
    }
    return await callGemini(geminiApiKey, fullPrompt);
  } else if (provider === 'openai') {
    if (!openaiApiKey) {
      throw new Error('OpenAI API Key is not set. Please configure it in Settings.');
    }
    return await callOpenAI(openaiApiKey, fullPrompt);
  } else {
    throw new Error(`Unsupported AI Provider: ${provider}`);
  }
}

// Call Gemini API
async function callGemini(apiKey, prompt) {
  try {
    // Dynamically require GoogleGenAI or use fetch if package import has issues
    // Note: The package is "@google/generative-ai"
    const { GoogleGenAI } = require('@google/generative-ai');
    
    // We instantiate using modern GoogleGenAI constructor
    // Or standard: const { GoogleGenerativeAI } = require('@google/generative-ai');
    const sdk = require('@google/generative-ai');
    const genAI = new sdk.GoogleGenerativeAI(apiKey);
    
    // Use gemini-1.5-flash as default medium-speed model
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Gemini API Error:', error.message);
    throw new Error(`Gemini API Error: ${error.message}`);
  }
}

// Call OpenAI API via direct fetch / node-fetch (built-in fetch in Node 18+)
async function callOpenAI(apiKey, prompt) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.5
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'HTTP Error');
    }
    
    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenAI API Error:', error.message);
    throw new Error(`OpenAI API Error: ${error.message}`);
  }
}

module.exports = {
  generateAnswer,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_TUGAS_PROMPT,
  DEFAULT_DISKUSI_PROMPT
};
