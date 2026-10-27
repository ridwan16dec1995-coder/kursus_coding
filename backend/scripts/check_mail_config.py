"""Periksa konfigurasi SMTP lalu kirim email uji coba.

Jalankan dari folder `backend`:

    python scripts/check_mail_config.py --send ke-alamat@gmail.com

Tanpa `--send`, skrip hanya memvalidasi konfigurasi dan koneksi SMTP.
Keluar dengan kode 0 bila berhasil dan 1 bila gagal.
"""

import argparse
import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

from dotenv import load_dotenv  # noqa: E402
from flask import Flask  # noqa: E402

from mailer import (  # noqa: E402
    MailConfigurationError,
    MailDeliveryError,
    get_mail_settings,
    is_mail_configured,
    send_test_email,
)

load_dotenv(PROJECT_ROOT / '.env')

REQUIRED_KEYS = ('MAIL_SERVER', 'MAIL_PORT', 'MAIL_USERNAME', 'MAIL_PASSWORD', 'MAIL_FROM')


def build_mail_app():
    app = Flask('mail-check')
    app.config.update(
        MAIL_SERVER=os.getenv('MAIL_SERVER'),
        MAIL_PORT=os.getenv('MAIL_PORT') or 587,
        MAIL_USERNAME=os.getenv('MAIL_USERNAME'),
        MAIL_PASSWORD=os.getenv('MAIL_PASSWORD'),
        MAIL_FROM=os.getenv('MAIL_FROM'),
        MAIL_TIMEOUT_SECONDS=int(os.getenv('MAIL_TIMEOUT_SECONDS') or 15),
        BRAND_NAME=os.getenv('BRAND_NAME', 'LahNgoding'),
    )
    # Skrip ini mencetak ringkasan sendiri, jadi log traceback Flask tidak perlu ditampilkan.
    app.logger.disabled = True
    return app


def report_configuration(app):
    missing = [key for key in REQUIRED_KEYS if not os.getenv(key)]
    settings = get_mail_settings(app)

    print('== Konfigurasi SMTP ==')
    print(f"MAIL_SERVER  : {settings['server'] or '<kosong>'}")
    print(f"MAIL_PORT    : {settings['port']}")
    print(f"MAIL_USERNAME: {settings['username'] or '<kosong>'}")
    print(f"MAIL_FROM    : {settings['sender'] or '<kosong>'}")
    print(f"App Password : {'terisi (' + str(len(settings['password'])) + ' karakter)' if settings['password'] else '<kosong>'}")
    print(f"FRONTEND_URL : {os.getenv('FRONTEND_URL', 'http://localhost:5173')}")

    if missing:
        print('\nGAGAL: variabel berikut belum terisi di .env -> ' + ', '.join(missing))
        print('Isi nilainya, lalu jalankan ulang skrip ini.')
        return False

    print('\nSemua variabel wajib terisi.')
    return True


def main():
    parser = argparse.ArgumentParser(description='Periksa konfigurasi email reset password.')
    parser.add_argument('--send', metavar='EMAIL', help='Kirim email uji coba ke alamat ini.')
    arguments = parser.parse_args()

    app = build_mail_app()

    if not report_configuration(app):
        return 1

    if not is_mail_configured(app):
        print('\nGAGAL: konfigurasi SMTP belum lengkap.')
        return 1

    print('\n== Menguji koneksi SMTP ==')
    try:
        send_test_email(app, arguments.send or app.config['MAIL_USERNAME'])
    except MailConfigurationError as error:
        print(f'GAGAL: {error}')
        return 1
    except MailDeliveryError as error:
        cause = error.__cause__
        print(f'GAGAL: {error}')
        if cause is not None:
            print(f'Detail dari server SMTP: {type(cause).__name__}: {cause}')
        print('\nPeriksa lagi:')
        print('  - Host dan port: smtp.gmail.com / 587 (TLS) atau 465 (SSL)')
        print('  - 2FA akun Gmail harus aktif dan App Password sudah dibuat')
        print('  - App Password tanpa spasi dan tanpa tanda hubung')
        print('  - Gmail bisa memblokir login dari IP server yang tidak dikenal')
        return 1

    target = arguments.send or app.config['MAIL_USERNAME']
    print(f'BERHASIL: email uji coba terkirim ke {target}.')
    print('Silakan cek folder inbox dan spam sebelum mengaktifkan fitur ini untuk murid.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
