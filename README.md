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
