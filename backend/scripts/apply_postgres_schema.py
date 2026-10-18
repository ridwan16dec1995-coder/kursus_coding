"""Apply the additive PostgreSQL schema using DATABASE_URL from the root .env."""

import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / '.env')
database_url = os.getenv('DATABASE_URL', '').strip()
if not database_url or database_url.startswith('mysql'):
    raise SystemExit('DATABASE_URL PostgreSQL belum diatur di file .env.')

schema_path = ROOT / 'backend' / 'database' / 'schema.postgresql.sql'
schema_sql = schema_path.read_text(encoding='utf-8')

with psycopg.connect(database_url) as connection:
    with connection.cursor() as cursor:
        cursor.execute(schema_sql)
        cursor.execute(
            """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name IN (
                'admin_users', 'students', 'announcements', 'student_progress',
                'courses', 'enrollments', 'weekly_grades'
              )
            ORDER BY table_name
            """
        )
        tables = [row[0] for row in cursor.fetchall()]

print('Schema PostgreSQL berhasil diterapkan.')
print('Tabel terdeteksi:', ', '.join(tables))
