import unittest
from unittest import mock

from app import StudentPasswordResetToken, create_app, db
from mailer import MailDeliveryError
from sqlalchemy.pool import StaticPool


class PasswordResetTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app({
            'TESTING': True,
            'RATE_LIMIT_ENABLED': False,
            'AUTO_CREATE_SCHEMA': True,
            'SECRET_KEY': 'test-secret',
            'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
            'SQLALCHEMY_ENGINE_OPTIONS': {
                'poolclass': StaticPool,
                'connect_args': {'check_same_thread': False},
            },
            'CORS_ALLOWED_ORIGINS': ['http://localhost:5173'],
            'FRONTEND_URL': 'https://kursus.example.com',
        })
        self.client = self.app.test_client()

        self.client.post('/api/students/register', json={
            'fullName': 'Murid Reset',
            'email': 'murid.reset@example.com',
            'username': 'murid-reset',
            'password': 'password-lama',
        })

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()
            db.engine.dispose()

    def request_reset(self, email='murid.reset@example.com'):
        return self.client.post('/api/student/forgot-password', json={'email': email})

    def test_forgot_password_sends_link_for_registered_email(self):
        with mock.patch('app.send_password_reset_email') as send_email:
            response = self.request_reset()

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.get_json()['ok'])
        send_email.assert_called_once()

        recipient, reset_url = send_email.call_args.args[1], send_email.call_args.args[2]
        self.assertEqual(recipient, 'murid.reset@example.com')
        self.assertTrue(reset_url.startswith('https://kursus.example.com/murid?resetToken='))

        with self.app.app_context():
            self.assertEqual(StudentPasswordResetToken.query.count(), 1)

    def test_forgot_password_keeps_response_generic_for_unknown_email(self):
        with mock.patch('app.send_password_reset_email') as send_email:
            response = self.request_reset('tidak.terdaftar@example.com')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.get_json()['message'],
            'Jika email terdaftar, tautan pengaturan ulang password telah dikirim.',
        )
        send_email.assert_not_called()

    def test_mail_failure_reports_service_unavailable_and_leaves_no_active_token(self):
        with mock.patch('app.send_password_reset_email', side_effect=MailDeliveryError('SMTP gagal')):
            response = self.request_reset()

        self.assertEqual(response.status_code, 503)
        self.assertIn('belum siap', response.get_json()['message'])

        with self.app.app_context():
            self.assertEqual(StudentPasswordResetToken.query.count(), 0)

    def test_new_request_invalidates_previous_reset_link(self):
        with mock.patch('app.send_password_reset_email'):
            self.request_reset()
            self.request_reset()

        with self.app.app_context():
            active = StudentPasswordResetToken.query.filter_by(used_at=None).all()
            self.assertEqual(len(active), 1)

    def test_token_from_email_can_reset_password_and_cannot_be_reused(self):
        with mock.patch('app.send_password_reset_email') as send_email:
            self.request_reset()

        reset_url = send_email.call_args.args[2]
        token = reset_url.split('resetToken=')[1]

        reset_response = self.client.post('/api/student/reset-password', json={
            'token': token,
            'password': 'password-baru-123',
        })
        self.assertEqual(reset_response.status_code, 200)

        reused = self.client.post('/api/student/reset-password', json={
            'token': token,
            'password': 'password-ketiga-456',
        })
        self.assertEqual(reused.status_code, 400)

        old_password = self.client.post('/api/student/login', json={
            'username': 'murid-reset',
            'password': 'password-lama',
        })
        self.assertEqual(old_password.status_code, 401)

        new_password = self.client.post('/api/student/login', json={
            'username': 'murid-reset',
            'password': 'password-baru-123',
        })
        self.assertEqual(new_password.status_code, 200)

    def test_expired_token_is_rejected(self):
        with self.app.app_context():
            from app import Student, hash_reset_token
            from datetime import datetime, timedelta, timezone

            student = Student.query.filter_by(username='murid-reset').first()
            expired = StudentPasswordResetToken(
                student_id=student.id,
                token_hash=hash_reset_token('token-kedaluwarsa'),
                expires_at=datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=1),
            )
            db.session.add(expired)
            db.session.commit()

        response = self.client.post('/api/student/reset-password', json={
            'token': 'token-kedaluwarsa',
            'password': 'password-baru-123',
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn('kedaluwarsa', response.get_json()['message'])

    def test_reset_password_requires_token_and_minimum_length(self):
        response = self.client.post('/api/student/reset-password', json={
            'token': '',
            'password': 'password-baru-123',
        })
        self.assertEqual(response.status_code, 400)

        response = self.client.post('/api/student/reset-password', json={
            'token': 'token-apapun',
            'password': 'pendek',
        })
        self.assertEqual(response.status_code, 400)


class ResetEmailContentTestCase(unittest.TestCase):
    """Isi email harus mengirim tautan reset apa adanya, tanpa pemenggalan."""

    def setUp(self):
        self.app = create_app({
            'TESTING': True,
            'SECRET_KEY': 'test-secret',
            'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
            'BRAND_NAME': 'LahNgoding',
        })

    def test_reset_url_stays_intact_in_both_email_formats(self):
        from mailer import _build_message, _reset_email_content

        reset_url = 'http://localhost:5173/murid?resetToken=abcdefghijklmnopqrstuvwxyz0123456789ABC'
        subject, plain, html = _reset_email_content(self.app, reset_url)
        message = _build_message('pengirim@example.com', 'murid@example.com', subject, plain, html)
        raw = message.as_string()

        # Tautan harus muncul utuh: tidak boleh di-encode quoted-printable (=3D)
        # dan tidak boleh dipotong di tengah jalan.
        self.assertNotIn('quoted-printable', raw)
        self.assertIn(reset_url, raw)
        self.assertGreaterEqual(raw.count(reset_url), 3)

    def test_email_content_is_plain_ascii(self):
        from mailer import _reset_email_content, to_ascii

        _, plain, html = _reset_email_content(self.app, 'http://localhost:5173/murid?resetToken=token')
        self.assertTrue(to_ascii(plain).isascii())
        self.assertTrue(to_ascii(html).isascii())
        self.assertNotIn('—', to_ascii(plain))
        self.assertNotIn('—', to_ascii(html))


if __name__ == '__main__':
    unittest.main()
