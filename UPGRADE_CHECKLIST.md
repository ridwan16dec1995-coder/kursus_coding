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
- [x] Backend test: 16 passed.
- [x] Frontend lint: passed.
- [x] Frontend production build: passed.
- [x] Python compile check: passed.
- [x] Backup SQLite lokal dan integrity check: passed.

## Menunggu persetujuan atau verifikasi environment

- [x] Pendaftaran siswa tetap umum; admin mengendalikan enrollment ke kursus.
- [x] Aturan nilai final ditetapkan sebagai ABCD dengan mapping numerik kompatibel.
- [ ] Menambahkan rate limiting login dan pendaftaran.
- [ ] Menambahkan audit log perubahan nilai dan data siswa.
- [ ] Menjalankan build Docker; Docker belum tersedia di mesin audit.
- [ ] Membuat database Neon dan menjalankan migration PostgreSQL.
- [ ] Mengonfigurasi hosting Render.
- [ ] Verifikasi harga dan batas free tier terbaru sebelum membuat resource.
- [ ] Menjalankan backup `pg_dump` dan uji restore pada database testing.
- [ ] Deployment production setelah persetujuan eksplisit pengguna.
- [ ] Backend Render: repository GitHub terhubung, environment variables terisi, dan health check publik lulus.
