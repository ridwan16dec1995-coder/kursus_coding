import tempfile
import unittest
from pathlib import Path

from app import create_app, db


class AuthenticationTestCase(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        database_path = Path(self.temp_dir.name, 'test.db').as_posix()
        self.app = create_app({
            'TESTING': True,
            'SECRET_KEY': 'test-secret',
            'SQLALCHEMY_DATABASE_URI': f'sqlite:///{database_path}',
            'CORS_ALLOWED_ORIGINS': ['http://localhost:5173'],
            'ADMIN_BOOTSTRAP_USERNAME': 'admin-test',
            'ADMIN_BOOTSTRAP_PASSWORD': 'password-test',
        })
        self.client = self.app.test_client()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()
            db.engine.dispose()
        self.temp_dir.cleanup()

    def login(self):
        response = self.client.post('/api/admin/login', json={
            'username': 'admin-test',
            'password': 'password-test',
        })
        self.assertEqual(response.status_code, 200)
        return response.get_json()

    def register_student(self):
        response = self.client.post('/api/students/register', json={
            'fullName': 'Murid Baru',
            'email': 'murid@example.com',
            'username': 'murid-baru',
            'password': 'password-murid',
        })
        self.assertEqual(response.status_code, 200)
        return response.get_json()['data']

    def student_login(self):
        response = self.client.post('/api/student/login', json={
            'username': 'murid-baru',
            'password': 'password-murid',
        })
        self.assertEqual(response.status_code, 200)
        return response.get_json()

    def test_student_account_is_created_and_can_access_own_profile(self):
        student = self.register_student()
        self.assertEqual(student['username'], 'murid-baru')
        self.assertNotIn('passwordHash', student)

        login_data = self.student_login()
        self.assertEqual(login_data['student']['id'], student['id'])
        self.assertTrue(login_data['csrfToken'])

        profile_response = self.client.get('/api/student/profile')
        self.assertEqual(profile_response.status_code, 200)
        self.assertEqual(profile_response.get_json()['data']['email'], 'murid@example.com')
        self.assertEqual(self.client.get('/api/students').status_code, 401)

    def test_student_login_rejects_invalid_credentials_and_duplicate_username(self):
        self.register_student()
        invalid_login = self.client.post('/api/student/login', json={
            'username': 'murid-baru',
            'password': 'password-salah',
        })
        self.assertEqual(invalid_login.status_code, 401)

        duplicate = self.client.post('/api/students/register', json={
            'fullName': 'Murid Kedua',
            'email': 'murid-kedua@example.com',
            'username': 'murid-baru',
            'password': 'password-kedua',
        })
        self.assertEqual(duplicate.status_code, 409)

    def test_student_logout_requires_csrf_and_revokes_access(self):
        self.register_student()
        login_data = self.student_login()

        missing_token = self.client.post('/api/student/logout')
        self.assertEqual(missing_token.status_code, 403)

        logout_response = self.client.post(
            '/api/student/logout',
            headers={'X-CSRF-Token': login_data['csrfToken']},
        )
        self.assertEqual(logout_response.status_code, 200)
        self.assertEqual(self.client.get('/api/student/profile').status_code, 401)

    def test_invalid_login_does_not_create_authenticated_session(self):
        response = self.client.post('/api/admin/login', json={
            'username': 'admin-test',
            'password': 'wrong-password',
        })

        self.assertEqual(response.status_code, 401)
        session_response = self.client.get('/api/admin/session')
        self.assertEqual(session_response.get_json(), {'ok': True, 'authenticated': False})

    def test_session_is_restored_after_login(self):
        login_data = self.login()

        self.assertEqual(login_data['username'], 'admin-test')
        self.assertTrue(login_data['csrfToken'])
        response = self.client.get('/api/admin/session')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()['username'], 'admin-test')
        self.assertTrue(response.get_json()['authenticated'])

    def test_admin_routes_require_login(self):
        self.assertEqual(self.client.get('/api/students').status_code, 401)
        self.assertEqual(self.client.get('/api/students/1').status_code, 401)
        self.assertEqual(
            self.client.post('/api/announcements', json={'title': 'Info', 'content': 'Kelas dimulai'}).status_code,
            401,
        )
        self.assertEqual(
            self.client.post('/api/students/1/progress', json={'subject': 'Python', 'score': 100}).status_code,
            401,
        )

    def test_admin_mutations_require_a_valid_csrf_token(self):
        login_data = self.login()

        response = self.client.post('/api/announcements', json={'title': 'Info', 'content': 'Kelas dimulai'})
        self.assertEqual(response.status_code, 403)

        response = self.client.post(
            '/api/announcements',
            json={'title': 'Info', 'content': 'Kelas dimulai'},
            headers={'X-CSRF-Token': login_data['csrfToken']},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()['data']['title'], 'Info')

        response = self.client.post('/api/students/1/progress', json={'subject': 'Python', 'score': 100})
        self.assertEqual(response.status_code, 403)

    def test_public_routes_remain_available(self):
        response = self.client.get('/api/announcements')
        self.assertEqual(response.status_code, 200)

        self.register_student()

    def test_progress_accepts_only_the_four_configured_scores(self):
        student = self.register_student()
        login_data = self.login()
        headers = {'X-CSRF-Token': login_data['csrfToken']}

        for score in (100, 80, 75, 60):
            with self.subTest(score=score):
                response = self.client.post(
                    f"/api/students/{student['id']}/progress",
                    json={'subject': 'Python', 'score': score},
                    headers=headers,
                )
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.get_json()['data']['score'], score)

        response = self.client.get(f"/api/students/{student['id']}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            {item['score'] for item in response.get_json()['data']['progress']},
            {100, 80, 75, 60},
        )

    def test_progress_rejects_scores_outside_the_configured_grades(self):
        student = self.register_student()
        login_data = self.login()
        headers = {'X-CSRF-Token': login_data['csrfToken']}

        for score in (99, 81, 0, 101):
            with self.subTest(score=score):
                response = self.client.post(
                    f"/api/students/{student['id']}/progress",
                    json={'subject': 'Python', 'score': score},
                    headers=headers,
                )
                self.assertEqual(response.status_code, 400)
                self.assertEqual(
                    response.get_json()['message'],
                    'Nilai harus salah satu dari A (100), B (80), C (75), atau D (60).',
                )

        for score in (True, 'bukan angka'):
            with self.subTest(score=score):
                response = self.client.post(
                    f"/api/students/{student['id']}/progress",
                    json={'subject': 'Python', 'score': score},
                    headers=headers,
                )
                self.assertEqual(response.status_code, 400)
                self.assertEqual(response.get_json()['message'], 'Nilai harus berupa angka.')

    def test_logout_revokes_access(self):
        login_data = self.login()

        response = self.client.post(
            '/api/admin/logout',
            headers={'X-CSRF-Token': login_data['csrfToken']},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get('/api/students').status_code, 401)


if __name__ == '__main__':
    unittest.main()
