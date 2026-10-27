# Kursus App Upgrade Checklist

## Selesai pada batch ini

- [x] Audit struktur, framework, database, autentikasi, test, backup, dan deployment.
- [x] Menetapkan default SQLite ke `backend/instance/course_platform.db`.
- [x] Membuat test backend terisolasi dengan SQLite in-memory.
- [x] Menambahkan driver PostgreSQL untuk target Neon.
- [x] Menambahkan model kursus, pendaftaran, dan nilai mingguan.
- [x] Menambahkan constraint unik, foreign key, dan aturan nilai ABCD (`A=100`, `B=80`, `C=75`, `D=60`).
- [x] Menambahkan API admin untuk kursus, pendaftaran, dan nilai mingguan.
- [x] Menampilkan kursus dan nilai mingguan pada portal siswa.
- [x] Menambahkan UI admin untuk membuat kursus, mendaftarkan siswa, dan mencatat nilai mingguan.
- [x] Menambahkan migration SQL MySQL dan PostgreSQL yang additive.
- [x] Menambahkan script backup SQLite dengan checksum dan integrity check.
- [x] Menambahkan WSGI, Dockerfile, `.dockerignore`, Render blueprint, dan SPA redirect.
- [x] Menambahkan batas ukuran request dan panjang input utama.
- [x] Menambahkan rate limit sederhana untuk login dan pendaftaran umum.
- [x] Backend test: 26 passed.
- [x] Frontend lint: passed.
- [x] Frontend production build: passed.
- [x] Python compile check: passed.
- [x] Backup SQLite lokal dan integrity check: passed.

## Lupa password murid lewat Gmail

- [x] Modul `backend/mailer.py` terpisah: SMTP dengan dukungan TLS (587) dan SSL (465).
- [x] App Password Gmail dibersihkan otomatis dari spasi sebelum login SMTP.
- [x] Email reset memakai dua format (teks dan HTML) dengan tombol tautan dan masa berlaku 30 menit.
- [x] Tautan reset memakai `FRONTEND_URL` sehingga hanya satu variabel yang perlu diatur.
- [x] Token reset disimpan sebagai SHA-256, hanya satu tautan aktif per murid, dan token lama dicabut saat permintaan baru.
- [x] Token dicabut otomatis bila pengiriman email gagal, sehingga tidak ada tautan aktif tanpa pemilik.
- [x] Balasan tetap generik untuk email yang tidak terdaftar agar email terdaftar tidak bisa ditebak.
- [x] Script `backend/scripts/check_mail_config.py` untuk memvalidasi konfigurasi dan mengirim email uji coba.
- [x] Migration `002_add_student_password_reset` sudah applied di database Neon.
- [x] Body email dikirim `7bit` tanpa quoted-printable agar URL reset tidak terpotong (sudah ada regression test).
- [x] Opsi `MAIL_STARTTLS` untuk server SMTP yang tidak memakai TLS.
- [x] Uji end-to-end lokal terpassed: request -> email tertangkap -> link dipakai -> password diganti -> token sekali pakai -> login password baru.
- [x] SMTP Gmail terverifikasi: email uji coba berhasil dikirim ke `ridwan16dec1995@gmail.com`.
- [x] Test backend `tests/test_password_reset.py` (9 test) dan test frontend `src/pages/StudentPage.test.jsx` (5 test).
- [x] `MAIL_USERNAME`, `MAIL_PASSWORD`, dan `MAIL_FROM` diisi di `.env` lokal dengan App Password Gmail.
- [ ] Email uji coba benar-benar dibuka di inbox Gmail oleh pemilik akun.
- [ ] Environment variable `MAIL_*` dan `FRONTEND_URL` diisi di platform hosting backend (Vercel atau Render).
- [ ] `FRONTEND_URL` production diarahkan ke URL frontend publik, bukan ke API.
- [ ] Alur reset password dicoba satu kali dari domain production.

## Menunggu persetujuan atau verifikasi environment

- [x] Pendaftaran siswa tetap umum; admin mengendalikan enrollment ke kursus.
- [x] Aturan nilai final ditetapkan sebagai ABCD dengan mapping numerik kompatibel.
- [x] Rate limiting login dan pendaftaran sudah aktif.
- [ ] Menambahkan audit log perubahan nilai dan data siswa.
- [ ] Menjalankan build Docker; Docker belum tersedia di mesin audit.
- [x] Database Neon dibuat dan migration PostgreSQL sudah dijalankan.
- [ ] Mengonfigurasi hosting Render.
- [ ] Verifikasi harga dan batas free tier terbaru sebelum membuat resource.
- [ ] Menjalankan backup `pg_dump` dan uji restore pada database testing.
- [ ] Deployment production setelah persetujuan eksplisit pengguna.
- [ ] Backend Render: repository GitHub terhubung, environment variables terisi, dan health check publik lulus.
