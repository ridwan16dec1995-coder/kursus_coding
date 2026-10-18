"""Create the first admin account using DATABASE_URL from the root .env."""

import getpass
import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash


ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / '.env')
database_url = os.getenv('DATABASE_URL', '').strip()
if not database_url or database_url.startswith('mysql'):
    raise SystemExit('DATABASE_URL PostgreSQL belum diatur di file .env.')

username = input('Username admin baru: ').strip()
password = getpass.getpass('Password admin baru (minimal 8 karakter): ')
confirmation = getpass.getpass('Ulangi password admin: ')
if not username or len(password) < 8 or password != confirmation:
    raise SystemExit('Username/password tidak valid atau konfirmasi tidak cocok.')

with psycopg.connect(database_url) as connection:
    with connection.cursor() as cursor:
        cursor.execute(
            'INSERT INTO admin_users (username, password_hash) VALUES (%s, %s) '
            'ON CONFLICT (username) DO NOTHING RETURNING id',
            (username, generate_password_hash(password)),
        )
        created = cursor.fetchone()

print('Admin berhasil dibuat.' if created else 'Username admin sudah ada; tidak ada perubahan.')
