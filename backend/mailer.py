"""Pengiriman email reset password lewat SMTP (Gmail).

Modul ini sengaja dipisah dari `app.py` agar logika SMTP mudah diuji tanpa
menyentuh database. Semua pesan yang gagal terkirim dicatat sebagai log
error, tidak pernah membocorkan kredensial ke respons API.
"""

import smtplib
import ssl
from email.message import EmailMessage
from email.policy import EmailPolicy

DEFAULT_TIMEOUT_SECONDS = 15
PASSWORD_RESET_TTL_MINUTES = 30

# Tanpa batas panjang baris dan tanpa quoted-printable, URL di dalam email
# tetap utuh satu baris. Kalau tidak, tautan reset bisa terpotong dan tidak
# bisa diklik oleh sebagian webmail.
MAIL_POLICY = EmailPolicy(max_line_length=998, cte_type='7bit', linesep='\r\n')


def to_ascii(text):
    """Ganti karakter non-ASCII supaya email bisa dikirim tanpa quoted-printable."""
    replacements = {
        '—': '-', '–': '-', '’': "'", '“': '"',
        '”': '"', '…': '...', ' ': ' ',
    }
    for source, target in replacements.items():
        text = text.replace(source, target)
    return text.encode('ascii', errors='replace').decode('ascii')


class MailConfigurationError(RuntimeError):
    """Konfigurasi SMTP belum lengkap."""


class MailDeliveryError(RuntimeError):
    """Email gagal dikirim karena masalah server SMTP."""


def get_mail_settings(app):
    """Kembalikan konfigurasi SMTP yang sudah dibersihkan dari `app.config`."""
    username = (app.config.get('MAIL_USERNAME') or '').strip()
    # App Password Gmail sering ditulis dengan spasi; smtplib akan menolak login bila spasi ikut.
    password = ''.join((app.config.get('MAIL_PASSWORD') or '').split())
    sender = (app.config.get('MAIL_FROM') or '').strip() or username
    try:
        port = int(app.config.get('MAIL_PORT') or 587)
    except (TypeError, ValueError):
        port = 587

    return {
        'server': (app.config.get('MAIL_SERVER') or '').strip(),
        'port': port,
        'username': username,
        'password': password,
        'sender': sender,
        'use_ssl': port == 465,
        'starttls': bool(app.config.get('MAIL_STARTTLS', True)),
        'timeout': int(app.config.get('MAIL_TIMEOUT_SECONDS') or DEFAULT_TIMEOUT_SECONDS),
    }


def is_mail_configured(app):
    """True bila semua nilai SMTP wajib sudah terisi."""
    settings = get_mail_settings(app)
    return all((settings['server'], settings['username'], settings['password'], settings['sender']))


def _build_message(sender, recipient, subject, plain_body, html_body):
    message = EmailMessage(policy=MAIL_POLICY)
    message['Subject'] = subject
    message['From'] = sender
    message['To'] = recipient
    message.set_content(to_ascii(plain_body))
    message.add_alternative(to_ascii(html_body), subtype='html')
    return message


def _reset_email_content(app, reset_url, ttl_minutes=PASSWORD_RESET_TTL_MINUTES):
    brand = app.config.get('BRAND_NAME', 'LahNgoding')
    subject = f'{brand} - Atur ulang password akun murid'
    plain_body = (
        'Kami menerima permintaan untuk mengatur ulang password akun murid Anda.\n\n'
        f'Buka tautan berikut dalam waktu {ttl_minutes} menit:\n{reset_url}\n\n'
        'Jika Anda tidak meminta perubahan ini, abaikan email ini. '
        'Password lama Anda tetap berlaku sampai tautan tersebut digunakan.'
    )
    html_body = f"""<!doctype html>
<html lang="id">
  <body style="margin:0;padding:24px;background:#f4f5f7;font-family:Segoe UI,Roboto,Arial,sans-serif;color:#1f2933;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;">
      <p style="margin:0 0 4px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#7b8794;">{brand}</p>
      <h1 style="margin:0 0 16px;font-size:20px;color:#1f2933;">Atur ulang password</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
        Kami menerima permintaan untuk mengatur ulang password akun murid Anda.
        Klik tombol di bawah untuk membuat password baru.
      </p>
      <p style="margin:0 0 24px;">
        <a href="{reset_url}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">
          Buat password baru
        </a>
      </p>
      <p style="margin:0 0 8px;font-size:13px;color:#7b8794;">Jika tombol tidak berfungsi, salin tautan ini ke browser:</p>
      <p style="margin:0 0 20px;font-size:13px;word-break:break-all;"><a href="{reset_url}" style="color:#2563eb;">{reset_url}</a></p>
      <p style="margin:0;font-size:13px;color:#7b8794;">
        Tautan berlaku {ttl_minutes} menit. Jika Anda tidak meminta perubahan ini, abaikan email ini —
        password lama Anda tetap berlaku.
      </p>
    </div>
  </body>
</html>"""
    return subject, plain_body, html_body


def _send(app, message):
    """Kirim pesan lewat SMTP; raises MailDeliveryError bila gagal."""
    settings = get_mail_settings(app)
    if not all((settings['server'], settings['username'], settings['password'], settings['sender'])):
        raise MailConfigurationError('Konfigurasi SMTP belum lengkap.')

    try:
        if settings['use_ssl']:
            server = smtplib.SMTP_SSL(
                settings['server'],
                settings['port'],
                timeout=settings['timeout'],
                context=ssl.create_default_context(),
            )
        else:
            server = smtplib.SMTP(settings['server'], settings['port'], timeout=settings['timeout'])

        with server:
            server.ehlo()
            if settings['use_ssl']:
                pass
            elif settings['starttls']:
                server.starttls(context=ssl.create_default_context())
                server.ehlo()
            server.login(settings['username'], settings['password'])
            server.send_message(message)
    except smtplib.SMTPAuthenticationError as error:
        app.logger.error('Autentikasi SMTP gagal; periksa MAIL_USERNAME dan App Password.')
        raise MailDeliveryError('Autentikasi SMTP gagal.') from error
    except (smtplib.SMTPException, OSError) as error:
        app.logger.exception('Pengiriman email gagal.')
        raise MailDeliveryError('Server SMTP tidak dapat dihubungi.') from error


def send_password_reset_email(app, recipient, reset_url):
    """Kirim tautan reset password ke `recipient`.

    Mengembalikan True bila email berhasil dikirim. Exception SMTP diterjemahkan
    menjadi `MailDeliveryError` supaya pemanggil bisa menrespond dengan pesan
    yang ramah tanpa membocorkan detail teknis.
    """
    subject, plain_body, html_body = _reset_email_content(app, reset_url)
    message = _build_message(get_mail_settings(app)['sender'], recipient, subject, plain_body, html_body)
    _send(app, message)
    app.logger.info('Email reset password berhasil dikirim.')
    return True


def send_test_email(app, recipient):
    """Kirim email uji coba untuk memverifikasi konfigurasi SMTP."""
    brand = app.config.get('BRAND_NAME', 'LahNgoding')
    subject = f'{brand} - Uji konfigurasi email'
    plain_body = (
        'Email ini adalah uji coba konfigurasi SMTP.\n\n'
        'Jika Anda membaca pesan ini, konfigurasi email sudah benar dan fitur '
        'lupa password siap dipakai.'
    )
    html_body = f"""<!doctype html>
<html lang="id">
  <body style="margin:0;padding:24px;background:#f4f5f7;font-family:Segoe UI,Roboto,Arial,sans-serif;color:#1f2933;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;">
      <p style="margin:0 0 4px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#7b8794;">{brand}</p>
      <h1 style="margin:0 0 16px;font-size:20px;">Konfigurasi email berhasil</h1>
      <p style="margin:0;font-size:15px;line-height:1.6;">
        Jika Anda membaca pesan ini, konfigurasi SMTP sudah benar dan fitur lupa password siap dipakai.
      </p>
    </div>
  </body>
</html>"""
    message = _build_message(get_mail_settings(app)['sender'], recipient, subject, plain_body, html_body)
    _send(app, message)
    return True
