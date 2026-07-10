# Panduan Lengkap Pemasangan di VPS Ubuntu
## UT Academic Assistant AI

Dokumen ini menjelaskan langkah demi langkah untuk melakukan deploy backend dan bot WhatsApp **UT Academic Assistant AI** di VPS Ubuntu, serta konfigurasi Nginx reverse proxy dan SSL (HTTPS).

---

### Langkah 1: Hubungkan ke VPS
Hubungkan ke server VPS Anda melalui SSH:
```bash
ssh root@IP_ADDRESS_VPS_ANDA
```
*(Ganti `IP_ADDRESS_VPS_ANDA` dengan alamat IP publik dari VPS).*

---

### Langkah 2: Update Sistem & Install Git + Node.js
Jalankan perintah berikut untuk meng-update repository paket dan menginstal Node.js v20 (LTS) beserta Git:
```bash
# Update paket list
sudo apt update && sudo apt upgrade -y

# Download setup script untuk Node.js v20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js, npm, dan Git
sudo apt-get install -y nodejs git
```
Verifikasi instalasi dengan mengecek versi:
```bash
node -v
npm -v
git --version
```

---

### Langkah 3: Install dan Konfigurasi Database PostgreSQL
Asisten AI ini mendukung PostgreSQL/Supabase untuk penyimpanan data jangka panjang yang andal.

1. **Install PostgreSQL**:
   ```bash
   sudo apt install postgresql postgresql-contrib -y
   ```

2. **Masuk ke Postgres CLI dan buat Database**:
   ```bash
   sudo -i -u postgres
   psql
   ```

3. **Buat User & Database baru di Postgres**:
   ```sql
   CREATE DATABASE ut_academic_assistant;
   CREATE USER ut_admin WITH PASSWORD 'adminpassword123';
   GRANT ALL PRIVILEGES ON DATABASE ut_academic_assistant TO ut_admin;
   \q
   ```
   Kembali ke user root VPS:
   ```bash
   exit
   ```

4. **Import Skema Database**:
   Masuk ke folder schema dan import file `schema.sql`:
   ```bash
   # Jalankan perintah ini setelah menaruh file project Anda di VPS
   psql -h localhost -U ut_admin -d ut_academic_assistant -f /var/www/academic-ai-bot/database/schema.sql
   ```
   *(Masukkan password `adminpassword123` saat diminta).*

---

### Langkah 4: Upload Project & Pemasangan Dependencies
1. Pindahkan folder `academic-ai-bot/` atau `BaileysBOT/` ke VPS di direktori `/var/www/academic-ai-bot/`.
2. Masuk ke folder backend:
   ```bash
   cd /var/www/academic-ai-bot/backend
   ```
3. Install dependensi NPM:
   ```bash
   npm install
   ```
4. Salin file konfigurasi lingkungan:
   ```bash
   cp .env.example .env
   ```
5. Edit file `.env` menggunakan editor nano:
   ```bash
   nano .env
   ```
   Sesuaikan parameter berikut:
   ```env
   PORT=5000
   JWT_SECRET=GANTI_DENGAN_TOKEN_JWT_RANDOM_ANDA_DISINI
   
   USE_POSTGRES=true
   DATABASE_URL=postgresql://ut_admin:adminpassword123@localhost:5432/ut_academic_assistant
   
   AI_PROVIDER=gemini
   GEMINI_API_KEY=KUNCI_API_GEMINI_ANDA_DISINI
   
   # Nomor WhatsApp admin (tanpa tanda +, awali 62)
   ADMIN_WHATSAPP=628xxxxxxxxx
   ```
   *Tekan `CTRL + O`, lalu `Enter` untuk menyimpan. Tekan `CTRL + X` untuk keluar.*

---

### Langkah 5: Pasang PM2 untuk Menjaga Server Tetap Aktif
PM2 berguna agar server Node.js tetap berjalan di latar belakang (background) dan otomatis restart jika server VPS mengalami reboot atau crash.

1. **Install PM2 secara global**:
   ```bash
   sudo npm install -g pm2
   ```

2. **Jalankan Backend**:
   ```bash
   pm2 start server.js --name "ut-academic-bot"
   ```

3. **Aktifkan Autostart PM2 saat VPS Reboot**:
   ```bash
   pm2 startup
   ```
   *(Salin dan jalankan perintah instruksi yang diberikan oleh terminal setelah mengetik `pm2 startup`).*

4. **Simpan konfigurasi PM2**:
   ```bash
   pm2 save
   ```

5. **Melihat Log Server**:
   ```bash
   # Gunakan ini untuk melihat QR Code WhatsApp pertama kali dari log terminal VPS
   pm2 logs ut-academic-bot
   ```

---

### Langkah 6: Build Frontend di VPS
Karena kita menggunakan IP VPS saja (tanpa domain), jika kita mendeploy frontend di Vercel/Netlify (yang menggunakan HTTPS), browser akan memblokir request API ke IP VPS (yang menggunakan HTTP) karena aturan **Mixed Content**.

Solusi terbaiknya adalah **meng-host frontend langsung di VPS Anda menggunakan Nginx** sehingga berjalan bersama backend di alamat IP VPS Anda secara aman dan mudah.

1. Masuk ke folder frontend di VPS:
   ```bash
   cd /var/www/academic-ai-bot/frontend
   ```
2. Install dependensi & compile frontend menjadi file statis (`dist`):
   ```bash
   npm install
   npm run build
   ```
   *(Proses ini akan menghasilkan folder `frontend/dist` yang berisi file web statis).*

---

### Langkah 7: Konfigurasi Nginx untuk IP VPS (Port 80)
Kita akan mengonfigurasi Nginx untuk menyajikan file frontend statis dan meneruskan (proxy) request `/api` ke backend Node.js (port 5000).

1. **Install Nginx**:
   ```bash
   sudo apt install nginx -y
   ```

2. **Edit file konfigurasi default Nginx**:
   ```bash
   sudo nano /etc/nginx/sites-available/default
   ```

3. **Ganti seluruh isi file tersebut dengan konfigurasi berikut**:
   ```nginx
   server {
       listen 80;
       server_name _; # Mendengarkan koneksi dari semua alamat IP VPS Anda

       # 1. Sajikan folder static React Frontend
       location / {
           root /var/www/academic-ai-bot/frontend/dist;
           index index.html;
           try_files $uri $uri/ /index.html;
       }

       # 2. Proxy request API ke Express Backend
       location /api {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. **Restart Nginx agar memuat konfigurasi baru**:
   ```bash
   sudo systemctl restart nginx
   ```
   *(Sekarang, Anda dapat mengakses dashboard langsung melalui alamat IP VPS Anda di browser: `http://IP_VPS_ANDA`).*

---

### Langkah 8: Menghubungkan WhatsApp Bot pertama kali
1. Jalankan `pm2 logs ut-academic-bot` di VPS.
2. QR Code akan muncul di terminal. Pindai (scan) menggunakan fitur *Tautkan Perangkat* (Linked Devices) di aplikasi WhatsApp HP Anda.
3. Setelah tertaut, bot akan langsung aktif merespon pesan. Anda juga bisa memantau status bot dan scan QR langsung melalui Web Dashboard yang sudah Anda deploy di Netlify/Vercel.
