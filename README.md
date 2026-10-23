# Platform Pendaftaran Belajar Ngoding

Aplikasi web untuk pendaftaran siswa, pengumuman kelas, dan progress belajar. Frontend dibuat dengan React, backend menggunakan Flask, dan database dapat memakai MySQL atau SQLite untuk penggunaan lokal.

## Fitur utama

- Form pendaftaran murid baru
- Login admin berbasis session cookie HttpOnly
- Logout dan pemulihan session saat halaman dimuat ulang
- Pengumuman kelas publik
- Data siswa dan progress belajar khusus admin
- Dashboard ringkas untuk admin

## Struktur project

- `backend/` : API Python Flask
- `frontend/` : aplikasi React
- `backend/database/schema.sql` : script SQL untuk MySQL
- `backend/database/schema.postgresql.sql` : schema PostgreSQL untuk Neon
- `backend/database/migrations/` : migration SQL additive yang ditinjau sebelum production, dengan varian MySQL dan PostgreSQL
- `.env.example` : contoh konfigurasi environment

## Setup backend

1. Masuk ke folder `backend`.
2. Buat dan aktifkan virtual environment, lalu pasang dependency:

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

3. Salin `.env.example` menjadi `.env`, kemudian isi nilai yang aman.

```env
USE_SQLITE=true
SECRET_KEY=isi-dengan-secret-acak-yang-panjang
CORS_ALLOWED_ORIGINS=http://localhost:5173
SESSION_COOKIE_SECURE=false
ADMIN_BOOTSTRAP_USERNAME=admin
ADMIN_BOOTSTRAP_PASSWORD=isi-password-admin-yang-kuat
```

`ADMIN_BOOTSTRAP_USERNAME` dan `ADMIN_BOOTSTRAP_PASSWORD` hanya dipakai untuk membuat akun pertama ketika tabel admin masih kosong. Setelah akun dibuat, hapus atau kosongkan kedua nilai tersebut dari `.env`.

4. Jalankan API:

```bash
python app.py
```

Untuk memakai MySQL, atur `USE_SQLITE=false`, sesuaikan variabel `DB_*` atau `DATABASE_URL`, lalu impor [backend/database/schema.sql](backend/database/schema.sql).

Untuk Neon/PostgreSQL, isi `DATABASE_URL` di `.env`, pasang dependency backend, lalu jalankan `python scripts/apply_postgres_schema.py` dari folder `backend`. Script ini tidak menghapus tabel atau data yang sudah ada.
Setelah schema selesai, buat admin pertama dengan `python scripts/create_admin.py`.

Untuk deployment backend saja di Render, gunakan [render.backend.yaml](render.backend.yaml). Blueprint tersebut membuat satu web service Docker di region Singapore dengan plan free; isi `DATABASE_URL`, `CORS_ALLOWED_ORIGINS`, dan admin bootstrap hanya di Render Environment Variables.

## Setup frontend

```bash
cd frontend
npm install
npm run dev
```

## Akses aplikasi

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000/api`

## Keamanan session

- Frontend dan backend lokal berjalan pada origin berbeda, sehingga `CORS_ALLOWED_ORIGINS` harus memuat URL frontend secara tepat.
- Untuk deployment HTTPS, atur `SESSION_COOKIE_SECURE=true` dan gunakan `SECRET_KEY` acak yang tidak pernah disimpan di repository.
- Aksi admin memakai session cookie dan token CSRF. Data murid, pengumuman baru, serta progress hanya tersedia setelah login.
- Jangan gunakan atau membagikan kredensial contoh. Buat password bootstrap yang kuat untuk setiap environment.

## Pengembangan berikutnya

- login murid
- upload materi
- jadwal kelas
- pembayaran
- dashboard mentor
- export data Excel/PDF

## Data kursus dan nilai mingguan

Pendaftaran akun siswa tetap terbuka untuk umum. Setelah akun dibuat, siswa belum otomatis masuk kursus; admin memilih siswa dan kursus melalui enrollment agar pendaftaran kelas tetap terkontrol.

Pendaftaran umum dan login memiliki rate limit sederhana berbasis alamat request untuk mengurangi spam dan brute-force pada penggunaan ringan. Untuk deployment dengan beberapa instance, gunakan rate limiter berbasis Redis atau gateway hosting karena state in-memory tidak dibagi antar-instance.

Model kursus baru menggunakan tabel `courses`, `enrollments`, dan `weekly_grades`. Endpoint enrollment dan nilai mingguan hanya dapat dimutasi oleh admin. Nilai menggunakan kategori ABCD dengan mapping `A=100`, `B=80`, `C=75`, dan `D=60`; tabel `student_progress` lama tetap dipertahankan untuk kompatibilitas data.

## Konfigurasi environment

- `APP_ENV=development` digunakan untuk komputer lokal. Nilai `production` mengharuskan `SECRET_KEY` minimal 32 karakter, `SESSION_COOKIE_SECURE=true`, dan `CORS_ALLOWED_ORIGINS` terisi.
- `AUTO_CREATE_SCHEMA=true` hanya untuk development atau test. Atur ke `false` pada production agar aplikasi tidak membuat atau mengubah tabel secara otomatis ketika dijalankan.
- `SQLITE_DATABASE_PATH` relatif terhadap root project, sehingga lokasi database tetap konsisten walaupun backend dijalankan dari folder berbeda.
- Fitur lupa password murid memakai SMTP. Untuk Gmail, aktifkan verifikasi 2 langkah dan buat `App Password`, lalu isi `MAIL_SERVER`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM`, serta `FRONTEND_URL`.
- Salin `frontend/.env.example` ke `frontend/.env` jika alamat API frontend perlu diubah. Gunakan `VITE_API_BASE_URL` tanpa menaruh secret di sana.
- Jangan menyimpan `.env`, backup database, atau database SQLite ke Git.

Sebelum mengaktifkan lupa password pada database production, jalankan migration `backend/database/migrations/002_add_student_password_reset.sql` untuk MySQL atau varian `.postgresql.sql` untuk PostgreSQL.

## Pemeriksaan aplikasi

Jalankan test backend dari folder `backend`:

```bash
pip install -r requirements-dev.txt
python -m pytest
```

Untuk memeriksa layanan dan koneksi database secara aman, buka `GET /api/health`. Endpoint ini tidak menampilkan kredensial atau detail error database.

## Catatan production

Server Flask bawaan hanya digunakan untuk development. Sebelum deployment, gunakan server WSGI, matikan pembuatan skema otomatis, siapkan migrasi database yang ditinjau, serta lakukan backup dan uji pemulihan terlebih dahulu.

## Backup SQLite lokal

Buat backup dan uji integritas database lokal dengan:

```bash
python backend/scripts/backup_sqlite.py
```

Skrip ini membuat salinan bertimestamp, checksum SHA-256, jumlah row, dan pemeriksaan `PRAGMA integrity_check`. Backup production PostgreSQL tetap harus menggunakan `pg_dump` dan disimpan di lokasi terpisah dari database utama.
