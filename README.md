# UT Academic Assistant AI

Asisten akademik AI interaktif untuk mahasiswa Universitas Terbuka (UT) yang membantu menjawab soal tugas, topik diskusi forum secara akademis, terstruktur, lengkap dengan kutipan referensi modul/buku. Dilengkapi dashboard panel admin web responsif modern, rate limit anti-spam, dan audit log interaksi mahasiswa.

---

## 🚀 Fitur Utama
1. **WhatsApp AI Bot (Baileys v6)**: Menjawab pesan mahasiswa secara otomatis menggunakan AI.
2. **Dashboard Web Responsif**: Tampilan admin dengan stat penggunaan, kelola mata kuliah, audit history chat, dan configurasi prompt AI.
3. **Format Output AI Terstruktur**:
   - **Mode Tugas**: Analisis soal, Jawaban mendalam, Langkah penjelasan, Kesimpulan, dan Referensi.
   - **Mode Diskusi**: Gaya forum mahasiswa UT yang natural, sopan, penjelasan konsep, contoh penerapan, dan opini pribadi.
4. **Validasi Referensi Pintar**: Pencegahan halusinasi referensi AI. Menyematkan kalimat *"Referensi perlu diverifikasi kembali"* jika sumber tidak dapat dipastikan secara ilmiah.
5. **Ekspor PDF & Copy-Share**: Memudahkan admin mengekspor jawaban mahasiswa ke PDF, meng-copy jawaban, atau membagikan langsung via teks WhatsApp.
6. **Rate Limiting & Anti-Spam**: Mencegah serangan bot spamming ke nomor WhatsApp asisten.
7. **Cadangan Data (Backup)**: Download dump JSON database lengkap langsung dari dashboard pengaturan.

---

## 📂 Struktur Project
```text
academic-ai-bot/
├── database/
│   └── schema.sql            # Skema database PostgreSQL
├── backend/
│   ├── routes/               # Handler router Express
│   ├── controllers/          # Kontroler logika bisnis API
│   ├── database.js           # Client DB (PostgreSQL + Fallback SQLite)
│   ├── ai.js                 # Integrasi API AI (Gemini & OpenAI)
│   ├── whatsapp.js           # Integrasi Bot WhatsApp Baileys
│   ├── package.json          # Dependencies backend
│   └── server.js             # Entrypoint server Express
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable UI (Sidebar, Navbar, StatsCard, QRModal)
│   │   ├── pages/            # View Dashboard, Chat, Courses, History, Settings
│   │   ├── App.jsx           # Routing & Context
│   │   └── index.css         # Styling Tailwind & Glassmorphism
│   ├── tailwind.config.js
│   ├── vite.config.js        # Konfigurasi proxy Vite
│   └── package.json          # Dependencies frontend React
├── .env.example              # Template env file global
└── README.md                 # Dokumentasi panduan
```

---

## 💻 Panduan Instalasi Lokal

### 1. Database
Secara default, jika Anda tidak memiliki database PostgreSQL aktif, backend akan **secara otomatis membuat database SQLite lokal** bernama `database.db` di folder `backend/`. Hal ini membuat sistem *langsung siap dijalankan tanpa konfigurasi DB rumit*.

Jika ingin menggunakan PostgreSQL/Supabase:
1. Jalankan query SQL di file `database/schema.sql` pada DB client Anda.
2. Update file `.env` (di folder `backend/`):
   ```env
   USE_POSTGRES=true
   DATABASE_URL=postgresql://postgres:password@localhost:5432/nama_database
   ```

### 2. Jalankan Backend
1. Masuk ke folder backend:
   ```bash
   cd backend
   ```
2. Buat file `.env` (copy dari `.env.example`) dan isi **GEMINI_API_KEY**:
   ```bash
   cp .env.example .env
   ```
3. Install dependencies (Pastikan Git terinstal di sistem Anda karena Baileys memerlukan Git untuk mengunduh dependency eksternal):
   ```bash
   npm install
   ```
4. Jalankan server:
   ```bash
   npm start
   ```
   *(Server akan berjalan di port `5000` dan QR Code bot akan tercetak di terminal).*

### 3. Jalankan Frontend
1. Masuk ke folder frontend:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Jalankan Vite dev server:
   ```bash
   npm run dev
   ```
4. Buka http://localhost:5173 di browser Anda.

---

## 🤖 Menu & Perintah WhatsApp Bot
Nomor mahasiswa yang mengirimkan pesan diawali tanda titik `.` akan ditanggapi asisten AI.

- `.help` : Menampilkan menu asisten.
- `.profile` : Menampilkan profil mahasiswa (Nama, NIM, Prodi).
  - *Edit Profil*: `.profile Nama: Budi Santoso | NIM: 041234567 | Prodi: Sistem Informasi`
- `.matkul` : Menampilkan mata kuliah atau menambahkan ke profil.
  - *Tambah Matkul*:
    ```text
    .matkul
    Nama: Manajemen Operasi
    Kode: EKMA4369
    ```
- `.referensi` : Kebijakan penyusunan referensi akademik.
- `.history` : Riwayat 5 pertanyaan terakhir Anda.
- `.status` : Status bot, koneksi database, dan model AI yang digunakan.
- `.tugas` : Mode menjawab tugas/soal kuliah.
  - *Format Pertanyaan*:
    ```text
    .tugas
    Mata Kuliah: Manajemen Operasi
    Kode MK: EKMA4369

    Pertanyaan:
    Bagaimana langkah menentukan tata letak fasilitas pabrik?
    ```
- `.diskusi` : Mode menjawab forum diskusi (format masukan sama seperti `.tugas`).

---

## ☁️ Cara Deploy VPS Ubuntu

Ikuti langkah-langkah berikut untuk mendeploy backend asisten AI di VPS Ubuntu agar berjalan terus menerus:

### 1. Persiapan Server
Update OS dan install dependencies dasar (Node.js LTS, Git, Nginx, PostgreSQL):
```bash
sudo apt update && sudo apt upgrade -y
# Install Node.js LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
```

### 2. Konfigurasi PostgreSQL
```bash
sudo apt install postgresql postgresql-contrib -y
sudo -i -u postgres
psql
# Di dalam psql, buat database dan user
CREATE DATABASE ut_academic_assistant;
CREATE USER ut_admin WITH PASSWORD 'adminpassword123';
GRANT ALL PRIVILEGES ON DATABASE ut_academic_assistant TO ut_admin;
\q
exit
```
Jalankan file `database/schema.sql` untuk membuat tabel database.

### 3. Clone Repository & Setup Project
Pindahkan file project Anda ke VPS (menggunakan git, rsync, atau sftp).
```bash
cd /var/www/academic-ai-bot/backend
npm install
# Edit file .env dan masukkan key asli Anda
nano .env
```
Ganti `USE_POSTGRES=true` dan isikan `DATABASE_URL=postgresql://ut_admin:adminpassword123@localhost:5432/ut_academic_assistant`.

### 4. Jalankan Menggunakan PM2
PM2 akan mengawasi process server Anda dan melakukan auto-restart jika server mengalami crash:
```bash
sudo npm install -g pm2
pm2 start server.js --name "ut-academic-bot"
# Agar pm2 otomatis berjalan saat VPS reboot:
pm2 startup
pm2 save
```

### 5. Konfigurasi Nginx Reverse Proxy & SSL
Buka konfigurasi Nginx untuk membuat proxy port 5000 ke domain publik:
```bash
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/default
```
Ubah isinya menjadi:
```nginx
server {
    listen 80;
    server_name api.domainanda.com; # Ganti dengan domain/subdomain Anda

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Simpan dan restart Nginx:
```bash
sudo systemctl restart nginx
```
Install Let's Encrypt SSL agar koneksi REST API aman (HTTPS):
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d api.domainanda.com
```

---

## ⚡ Cara Deploy Frontend ke Netlify / Vercel

Karena frontend dibangun menggunakan React + Vite, output compile nya adalah file statis murni yang bisa dideploy gratis ke Vercel atau Netlify.

### Langkah Deploy (Vercel / Netlify):
1. Pastikan Anda memiliki akun Vercel atau Netlify.
2. Hubungkan repository GitHub Anda ke Vercel/Netlify.
3. Konfigurasikan Build Settings:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
4. **SANGAT PENTING**: Tambahkan Environment Variable di panel pengaturan Vercel/Netlify:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://api.domainanda.com` (Ubah ke alamat REST API Nginx VPS Ubuntu HTTPS Anda).
5. Klik **Deploy**. Selesai!
