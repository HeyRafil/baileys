const { 
  default: makeWASocket, 
  useMultiFileAuthState, 
  DisconnectReason,
  delay
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');
const db = require('./database');
const ai = require('./ai');

let sock = null;
let connectionStatus = 'disconnected'; // 'disconnected', 'connecting', 'connected'
let currentQR = null;
const userCooldowns = new Map();

// Cooldown time in milliseconds
const COOLDOWN_MS = parseInt(process.env.WA_COOLDOWN_MS || '3000');

async function connectToWhatsApp() {
  const sessionDir = path.join(__dirname, 'whatsapp_session');
  
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  connectionStatus = 'connecting';
  console.log('Initializing WhatsApp Bot client...');

  sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false // We will print it ourselves with styling
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQR = qr;
      connectionStatus = 'disconnected';
      
      // Print QR to console
      console.log('\n======================================================');
      console.log('WhatsApp Bot: QR Code generated. Scan to authenticate:');
      console.log('======================================================\n');
      qrcodeTerminal.generate(qr, { small: true });
      
      // Convert QR to base64 image data URI for the dashboard
      try {
        currentQR = await QRCode.toDataURL(qr);
      } catch (err) {
        console.error('Failed to generate base64 QR code image:', err);
      }
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('WhatsApp connection closed due to:', lastDisconnect?.error || 'unknown', '. Reconnecting:', shouldReconnect);
      connectionStatus = 'disconnected';
      currentQR = null;
      
      if (shouldReconnect) {
        // Delay reconnection to prevent looping
        await delay(5000);
        connectToWhatsApp();
      } else {
        console.log('Logged out. Please delete the whatsapp_session folder and scan again.');
      }
    } else if (connection === 'open') {
      console.log('======================================================');
      console.log('WhatsApp Bot is CONNECTED and ready!');
      console.log('======================================================');
      connectionStatus = 'connected';
      currentQR = null;
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    try {
      if (m.type !== 'notify') return;
      const msg = m.messages[0];
      if (!msg.message || msg.key.fromMe) return;

      const from = msg.key.remoteJid;
      const whatsappNumber = from.split('@')[0];
      
      // Extract text content from message
      const textMessage = 
        msg.message.conversation || 
        msg.message.extendedTextMessage?.text || 
        msg.message.imageMessage?.caption || 
        '';

      if (!textMessage.trim().startsWith('.')) return;

      // Anti-spam / Cooldown check
      const now = Date.now();
      if (userCooldowns.has(whatsappNumber)) {
        const lastTime = userCooldowns.get(whatsappNumber);
        if (now - lastTime < COOLDOWN_MS) {
          console.log(`[Anti-Spam] Message from ${whatsappNumber} rate-limited.`);
          await sock.sendMessage(from, { text: '⚠️ *Mohon tunggu sebentar sebelum mengirim perintah lagi (anti-spam).*' });
          return;
        }
      }
      userCooldowns.set(whatsappNumber, now);

      console.log(`[WA Command] Received: "${textMessage}" from ${whatsappNumber}`);
      await handleIncomingCommand(from, whatsappNumber, textMessage);
    } catch (err) {
      console.error('Error handling messages.upsert:', err);
    }
  });
}

// Ensure user exists in the DB, otherwise register
async function getOrCreateUser(whatsappNumber, senderName = 'Mahasiswa UT') {
  const result = await db.query('SELECT * FROM users WHERE whatsapp_number = $1', [whatsappNumber]);
  if (result.rows.length > 0) {
    return result.rows[0];
  } else {
    // Check if it's the admin phone number
    const adminWa = process.env.ADMIN_WHATSAPP || '6281234567890';
    const role = (whatsappNumber === adminWa) ? 'admin' : 'member';
    
    console.log(`[Registration] Creating user entry for ${whatsappNumber} as ${role}`);
    const insertRes = await db.query(
      'INSERT INTO users (nama, whatsapp_number, role, prodi) VALUES ($1, $2, $3, $4) RETURNING *',
      [senderName, whatsappNumber, role, 'Umum']
    ).catch(async () => {
      // Fallback for query (like SQLite without RETURNING support if any, though it should work)
      await db.query('INSERT INTO users (nama, whatsapp_number, role, prodi) VALUES ($1, $2, $3, $4)', [senderName, whatsappNumber, role, 'Umum']);
      const fetch = await db.query('SELECT * FROM users WHERE whatsapp_number = $1', [whatsappNumber]);
      return fetch;
    });

    const returnedUser = insertRes.rows ? insertRes.rows[0] : null;
    if (returnedUser) return returnedUser;
    
    // SQLite manual fetch fallback
    const fallbackFetch = await db.query('SELECT * FROM users WHERE whatsapp_number = $1', [whatsappNumber]);
    return fallbackFetch.rows[0];
  }
}

// Main Commands Router
async function handleIncomingCommand(from, whatsappNumber, textMessage) {
  const user = await getOrCreateUser(whatsappNumber);
  
  // Extract command name and args
  const firstLine = textMessage.split('\n')[0].trim();
  const command = firstLine.split(' ')[0].toLowerCase();
  const commandArgs = firstLine.substring(command.length).trim();

  let responseText = '';

  switch (command) {
    case '.help':
      responseText = getHelpText();
      await reply(from, responseText);
      await logBotActivity(whatsappNumber, '.help', textMessage, responseText);
      break;

    case '.profile':
      responseText = await handleProfile(user, commandArgs, textMessage);
      await reply(from, responseText);
      await logBotActivity(whatsappNumber, '.profile', textMessage, responseText);
      break;

    case '.matkul':
      responseText = await handleMatkul(user, textMessage);
      await reply(from, responseText);
      await logBotActivity(whatsappNumber, '.matkul', textMessage, responseText);
      break;

    case '.referensi':
      responseText = getReferensiText();
      await reply(from, responseText);
      await logBotActivity(whatsappNumber, '.referensi', textMessage, responseText);
      break;

    case '.status':
      responseText = getStatusText();
      await reply(from, responseText);
      await logBotActivity(whatsappNumber, '.status', textMessage, responseText);
      break;

    case '.history':
      responseText = await handleHistory(user);
      await reply(from, responseText);
      await logBotActivity(whatsappNumber, '.history', textMessage, responseText);
      break;

    case '.tugas':
    case '.diskusi':
      // Show loading/processing state
      await sock.sendMessage(from, { text: '⏳ *Asisten AI sedang menganalisis soal Anda...*' });
      responseText = await handleSolveQuestion(user, command.substring(1), textMessage);
      await reply(from, responseText);
      await logBotActivity(whatsappNumber, command, textMessage, responseText);
      break;

    default:
      // Unknown command
      responseText = `❌ Perintah tidak dikenal: *${command}*\n\nKetik *.help* untuk menampilkan seluruh daftar perintah asisten AI.`;
      await reply(from, responseText);
      break;
  }
}

// Logger helper
async function logBotActivity(whatsappNumber, command, message, response) {
  try {
    await db.query(
      'INSERT INTO bot_logs (whatsapp_number, command, message, response) VALUES ($1, $2, $3, $4)',
      [whatsappNumber, command, message, response]
    );
  } catch (err) {
    console.error('Error logging bot activity:', err.message);
  }
}

// Send helper
async function reply(jid, text) {
  if (sock) {
    await sock.sendMessage(jid, { text: text });
  }
}

function getHelpText() {
  return `🤖 *UT Academic Assistant AI*
Halo! Saya adalah asisten akademik Anda. Gunakan menu perintah di bawah ini untuk berinteraksi:

*Menu Informasi & Profil:*
• *.help* - Menampilkan bantuan ini
• *.profile* - Melihat atau mengedit profil mahasiswa
• *.matkul* - Menyimpan mata kuliah Anda saat ini
• *.status* - Melihat status sistem & koneksi AI
• *.referensi* - Informasi sistem referensi akademik
• *.history* - Menampilkan riwayat 5 pertanyaan terakhir Anda

*Fitur Utama AI:*
• *.tugas* - Mode Analisis Tugas Kuliah
• *.diskusi* - Mode Analisis Forum Diskusi

---
💡 *Tips Penggunaan Perintah:*
*Update Profil:*
Ketik: \`.profile Nama: Budi Santoso | NIM: 041234567 | Prodi: Sistem Informasi\`

*Menyimpan Mata Kuliah:*
Ketik:
\`\`\`
.matkul
Nama: Manajemen Operasi
Kode: EKMA4369
\`\`\`

*Bertanya Soal Tugas:*
Ketik:
\`\`\`
.tugas
Mata Kuliah: Manajemen Operasi
Kode MK: EKMA4369

Pertanyaan:
Bagaimana cara menghitung safety stock?
\`\`\`
_(Anda juga bisa langsung bertanya setelah .tugas jika mata kuliah sudah terdaftar di profil Anda)_`;
}

async function handleProfile(user, args, fullText) {
  // Check if args are passed to edit profile
  // Format: .profile Nama: X | NIM: Y | Prodi: Z
  if (args || fullText.includes(':')) {
    const content = fullText.substring(8); // Remove '.profile'
    const parts = content.split(/[|]/);
    
    let nama = user.nama;
    let nim = user.nim;
    let prodi = user.prodi;
    
    parts.forEach(part => {
      const kv = part.split(':');
      if (kv.length >= 2) {
        const key = kv[0].trim().toLowerCase();
        const value = kv.slice(1).join(':').trim();
        
        if (key === 'nama') nama = value;
        if (key === 'nim') nim = value;
        if (key === 'prodi' || key === 'program studi') prodi = value;
      }
    });

    try {
      await db.query(
        'UPDATE users SET nama = $1, nim = $2, prodi = $3 WHERE id = $4',
        [nama, nim, prodi, user.id]
      );
      return `✅ *Profil Berhasil Diperbarui!*\n\n• Nama: ${nama}\n• NIM: ${nim}\n• Program Studi: ${prodi}\n• WhatsApp: ${user.whatsapp_number}`;
    } catch (err) {
      if (err.message.includes('unique') || err.message.includes('UNIQUE')) {
        return `❌ *Gagal memperbarui profil:* NIM *${nim}* sudah terdaftar oleh pengguna lain.`;
      }
      return `❌ *Gagal memperbarui profil:* ${err.message}`;
    }
  }

  // Show profile
  return `👤 *Profil Mahasiswa UT*
• Nama: ${user.nama || '-'}
• NIM: ${user.nim || '-'}
• Program Studi: ${user.prodi || '-'}
• WhatsApp: ${user.whatsapp_number}
• Peran: ${user.role.toUpperCase()}
• Terdaftar: ${new Date(user.created_at).toLocaleDateString('id-ID')}

*Catatan:*
Ketik \`.profile Nama: [Nama Anda] | NIM: [NIM Anda] | Prodi: [Program Studi]\` untuk merubah data Anda.`;
}

async function handleMatkul(user, fullText) {
  // Parse format:
  // .matkul
  // Nama: Manajemen Operasi
  // Kode: EKMA4369
  const lines = fullText.split('\n');
  let namaMatkul = '';
  let kodeMatkul = '';
  
  lines.forEach(line => {
    if (line.toLowerCase().startsWith('nama:')) {
      namaMatkul = line.substring(5).trim();
    }
    if (line.toLowerCase().startsWith('kode:')) {
      kodeMatkul = line.substring(5).trim();
    }
  });

  if (!namaMatkul || !kodeMatkul) {
    // Let's check if they used single-line or basic command
    // Otherwise list courses
    const userCourses = await db.query('SELECT * FROM courses ORDER BY kode_matkul ASC');
    let coursesText = `📚 *Daftar Mata Kuliah Tersedia:*\n`;
    if (userCourses.rows.length === 0) {
      coursesText += `Belum ada mata kuliah yang terdaftar di database.\n`;
    } else {
      userCourses.rows.forEach(c => {
        coursesText += `• [${c.kode_matkul}] - ${c.nama_matkul}\n`;
      });
    }
    coursesText += `\n*Format Tambah/Simpan Mata Kuliah:*\n\`\`\`\n.matkul\nNama: [Nama Mata Kuliah]\nKode: [Kode MK]\n\`\`\``;
    return coursesText;
  }

  try {
    // Insert or update course
    await db.query(
      'INSERT INTO courses (nama_matkul, kode_matkul) VALUES ($1, $2) ON CONFLICT(kode_matkul) DO UPDATE SET nama_matkul = EXCLUDED.nama_matkul',
      [namaMatkul, kodeMatkul]
    ).catch(async () => {
      // sqlite
      await db.query('INSERT OR REPLACE INTO courses (nama_matkul, kode_matkul) VALUES ($1, $2)', [namaMatkul, kodeMatkul]);
    });

    return `✅ *Mata Kuliah Berhasil Disimpan!*\n• Kode: ${kodeMatkul}\n• Mata Kuliah: ${namaMatkul}`;
  } catch (err) {
    return `❌ Gagal menyimpan mata kuliah: ${err.message}`;
  }
}

function getReferensiText() {
  return `📚 *Sistem Referensi Akademik UT AI*
Untuk menjaga integritas akademik, UT Academic Assistant AI mematuhi aturan ketat dalam menyusun jawaban kuliah:

1. *Sumber Resmi:* Jawaban diutamakan menggunakan Buku Materi Pokok (BMP) Universitas Terbuka, modul perkuliahan, jurnal ilmiah nasional/internasional, dan situs web resmi pemerintah/institusi.
2. *Anti-Halusinasi:* AI didesain untuk tidak mengarang referensi palsu.
3. *Status Verifikasi:* Jika sumber referensi tidak dapat divalidasi secara pasti dari database AI, sistem akan menyematkan kalimat:
   *"Referensi perlu diverifikasi kembali."*
   Hal ini bertujuan agar mahasiswa melakukan cross-check ulang dengan modul cetak asli mereka.`;
}

function getStatusText() {
  const provider = process.env.AI_PROVIDER || 'gemini';
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  
  return `🤖 *Status UT Academic Bot*
• Uptime: ${hours} jam, ${minutes} menit, ${seconds} detik
• Status Koneksi: Connected ✅
• AI Engine: ${provider.toUpperCase()}
• Keamanan: Anti-Spam (Rate Limit) Aktif
• DB Engine: ${db.getDbType().toUpperCase()}`;
}

async function handleHistory(user) {
  try {
    const res = await db.query(
      'SELECT q.*, c.kode_matkul, c.nama_matkul FROM questions q LEFT JOIN courses c ON q.course_id = c.id WHERE q.user_id = $1 ORDER BY q.created_at DESC LIMIT 5',
      [user.id]
    );

    if (res.rows.length === 0) {
      return `📂 *Riwayat Pertanyaan Anda Kosong.*\nMulai bertanya menggunakan command *.tugas* atau *.diskusi*.`;
    }

    let historyText = `📂 *Riwayat 5 Pertanyaan Terakhir Anda:*\n\n`;
    res.rows.forEach((row, i) => {
      const dateStr = new Date(row.created_at).toLocaleDateString('id-ID');
      const matkulStr = row.kode_matkul ? `${row.kode_matkul} - ${row.nama_matkul}` : 'Umum';
      historyText += `*${i + 1}. [${row.mode.toUpperCase()}] [${dateStr}]*\nMata Kuliah: ${matkulStr}\nTanya: "${row.question.substring(0, 60)}${row.question.length > 60 ? '...' : ''}"\n\n`;
    });
    return historyText;
  } catch (err) {
    return `❌ Gagal mengambil riwayat: ${err.message}`;
  }
}

async function handleSolveQuestion(user, mode, fullText) {
  // Parse variables from body
  // Support format:
  // .tugas / .diskusi
  // Mata Kuliah: [Nama]
  // Kode MK: [Kode]
  // Pertanyaan:
  // [Soal]
  
  let namaMatkul = '';
  let kodeMatkul = '';
  let question = '';

  const lines = fullText.split('\n');
  let parsingQuestion = false;
  let questionLines = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.toLowerCase().startsWith('mata kuliah:')) {
      namaMatkul = line.substring(12).trim();
      continue;
    }
    if (line.toLowerCase().startsWith('kode mk:') || line.toLowerCase().startsWith('kode:')) {
      const idx = line.indexOf(':');
      kodeMatkul = line.substring(idx + 1).trim();
      continue;
    }
    if (line.toLowerCase().startsWith('pertanyaan:')) {
      parsingQuestion = true;
      const rem = line.substring(11).trim();
      if (rem) questionLines.push(rem);
      continue;
    }

    if (parsingQuestion) {
      questionLines.push(lines[i]);
    } else {
      // If we haven't hit "Pertanyaan:" but there are lines, accumulate them
      if (line !== '') {
        questionLines.push(lines[i]);
      }
    }
  }

  question = questionLines.join('\n').trim();

  // If question is still empty, let's treat the entire content after the command line as the question
  if (!question) {
    question = lines.slice(1).join('\n').trim();
  }

  if (!question) {
    return `⚠️ *Gagal Memproses:* Pertanyaan tidak boleh kosong.\n\n*Format Contoh:*
.tugas
Mata Kuliah: Manajemen Operasi
Kode MK: EKMA4369

Pertanyaan:
[Tulis pertanyaan Anda di sini]`;
  }

  // Look up course in DB or register it
  let courseId = null;
  if (kodeMatkul) {
    let courseRes = await db.query('SELECT * FROM courses WHERE kode_matkul = $1', [kodeMatkul]);
    if (courseRes.rows.length === 0) {
      // Auto register course
      const insertCourse = await db.query(
        'INSERT INTO courses (nama_matkul, kode_matkul) VALUES ($1, $2) RETURNING id',
        [namaMatkul || 'Mata Kuliah ' + kodeMatkul, kodeMatkul]
      ).catch(async () => {
        await db.query('INSERT INTO courses (nama_matkul, kode_matkul) VALUES ($1, $2)', [namaMatkul || 'Mata Kuliah ' + kodeMatkul, kodeMatkul]);
        return await db.query('SELECT id FROM courses WHERE kode_matkul = $1', [kodeMatkul]);
      });
      courseId = insertCourse.rows[0]?.id;
    } else {
      courseId = courseRes.rows[0].id;
      if (!namaMatkul) {
        namaMatkul = courseRes.rows[0].nama_matkul;
      }
    }
  }

  // Build AI Context
  const context = {
    nama_mahasiswa: user.nama,
    nim_mahasiswa: user.nim,
    prodi_mahasiswa: user.prodi,
    nama_matkul: namaMatkul,
    kode_matkul: kodeMatkul
  };

  try {
    // Generate AI response
    const answer = await ai.generateAnswer(mode, question, context);

    // Save question and answer to DB
    let referencesUsed = '';
    // Extract references from response if possible
    const refMatch = answer.match(/Referensi:\s*([\s\S]*)$/i);
    if (refMatch) {
      referencesUsed = refMatch[1].trim();
    } else {
      // Discussion mode references
      const refMatchDisc = answer.match(/Referensi:\s*([\s\S]*)$/i);
      if (refMatchDisc) {
        referencesUsed = refMatchDisc[1].trim();
      }
    }

    await db.query(
      'INSERT INTO questions (user_id, course_id, mode, question, answer, references_used) VALUES ($1, $2, $3, $4, $5, $6)',
      [user.id, courseId, mode, question, answer, referencesUsed]
    );

    return answer;
  } catch (err) {
    console.error('AI Processing Error:', err);
    return `❌ *Maaf, terjadi kesalahan saat memproses jawaban dengan AI.*\n\nDetail Error: ${err.message}`;
  }
}

// Export functions to share socket and states
module.exports = {
  connectToWhatsApp,
  getQR: () => currentQR,
  getStatus: () => connectionStatus,
  sendMessage: async (to, text) => {
    if (sock && connectionStatus === 'connected') {
      const formattedTo = to.includes('@') ? to : `${to}@s.whatsapp.net`;
      await sock.sendMessage(formattedTo, { text });
      return true;
    }
    return false;
  }
};
