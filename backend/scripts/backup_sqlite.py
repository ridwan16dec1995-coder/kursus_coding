"""Create and verify a local SQLite backup without exposing application data."""

import hashlib
import json
import os
import shutil
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
source = Path(os.getenv('SQLITE_DATABASE_PATH', 'backend/instance/course_platform.db'))
if not source.is_absolute():
    source = ROOT / source
source = source.resolve()
backup_root = ROOT / 'backups' / 'sqlite' / datetime.now().strftime('%Y-%m-%d')
backup_root.mkdir(parents=True, exist_ok=True)

if not source.exists():
    raise SystemExit(f'SQLite database tidak ditemukan: {source}')

destination = backup_root / f'{source.stem}-{datetime.now().strftime("%H%M%S")}.db'
shutil.copy2(source, destination)

connection = sqlite3.connect(f'file:{destination}?mode=ro', uri=True)
try:
    integrity = connection.execute('PRAGMA integrity_check').fetchone()[0]
    tables = [row[0] for row in connection.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )]
    counts = {
        table: connection.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0]
        for table in tables
    }
finally:
    connection.close()

if integrity != 'ok':
    destination.unlink(missing_ok=True)
    raise SystemExit(f'Backup gagal pemeriksaan integritas: {integrity}')

digest = hashlib.sha256(destination.read_bytes()).hexdigest()
manifest = {
    'source': str(source),
    'backup': str(destination),
    'sha256': digest,
    'bytes': destination.stat().st_size,
    'createdAtUtc': datetime.now(timezone.utc).isoformat(),
    'integrity': integrity,
    'counts': counts,
}
(backup_root / f'{destination.stem}.manifest.json').write_text(
    json.dumps(manifest, indent=2), encoding='utf-8'
)
print(json.dumps(manifest, indent=2))
