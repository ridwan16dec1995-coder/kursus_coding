import os
import unittest
from unittest import mock

from app import (
    AdminUser,
    _rate_limit_state,
    allowed_origins_from_environment,
    bootstrap_first_admin,
    create_app,
    db,
)
from sqlalchemy.pool import StaticPool


class AuthenticationTestCase(unittest.TestCase):
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
            'ADMIN_BOOTSTRAP_USERNAME': 'admin-test',
            'ADMIN_BOOTSTRAP_PASSWORD': 'password-test',
        })
        self.client = self.app.test_client()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()
            db.engine.dispose()

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

    def test_public_registration_is_rate_limited(self):
        self.app.config['RATE_LIMIT_ENABLED'] = True
        _rate_limit_state.clear()
        for index in range(5):
            response = self.client.post('/api/students/register', json={
                'fullName': f'Murid {index}',
                'email': f'murid-{index}@example.com',
                'username': f'murid-{index}',
                'password': 'password-murid',
            })
            self.assertEqual(response.status_code, 200)
        limited = self.client.post('/api/students/register', json={
            'fullName': 'Murid Keenam',
            'email': 'murid-6@example.com',
            'username': 'murid-6',
            'password': 'password-murid',
        })
        self.assertEqual(limited.status_code, 429)

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

    def test_health_check_confirms_database_and_sets_security_headers(self):
        response = self.client.get('/api/health')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()['database'], 'ready')
        self.assertEqual(response.headers['X-Content-Type-Options'], 'nosniff')
        self.assertEqual(response.headers['X-Frame-Options'], 'DENY')

    def test_production_configuration_requires_secure_session_cookie(self):
        with self.assertRaisesRegex(RuntimeError, 'SESSION_COOKIE_SECURE'):
            create_app({
                'APP_ENV': 'production',
                'SECRET_KEY': 'a' * 32,
                'SESSION_COOKIE_SECURE': False,
                'CORS_ALLOWED_ORIGINS': ['https://kursus.example.com'],
                'AUTO_CREATE_SCHEMA': False,
            })

    def test_allowed_origins_come_only_from_the_environment(self):
        with mock.patch.dict(os.environ, {'CORS_ALLOWED_ORIGINS': 'https://kursus.example.com'}):
            self.assertEqual(allowed_origins_from_environment(), ['https://kursus.example.com'])

        with mock.patch.dict(os.environ, {'CORS_ALLOWED_ORIGINS': ''}):
            self.assertEqual(allowed_origins_from_environment(), [])

    def test_bootstrap_never_overwrites_an_existing_admin_password(self):
        original = self.login()
        self.assertTrue(original['ok'])

        with self.app.app_context():
            self.app.config['ADMIN_BOOTSTRAP_PASSWORD'] = 'password-yang-berbeda'
            bootstrap_first_admin(self.app)

        rejected = self.client.post('/api/admin/login', json={
            'username': 'admin-test',
            'password': 'password-yang-berbeda',
        })
        self.assertEqual(rejected.status_code, 401)
        self.assertEqual(self.login()['ok'], True)

    def test_bootstrap_skips_when_any_admin_already_exists(self):
        with self.app.app_context():
            self.app.config['ADMIN_BOOTSTRAP_USERNAME'] = 'admin-kedua'
            bootstrap_first_admin(self.app)
            self.assertEqual(AdminUser.query.count(), 1)

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

    def test_admin_can_create_course_enrollment_and_weekly_grade(self):
        student = self.register_student()
        login_data = self.login()
        headers = {'X-CSRF-Token': login_data['csrfToken']}

        course_response = self.client.post(
            '/api/courses',
            json={'name': 'Python Dasar', 'description': 'Kursus pemrograman dasar'},
            headers=headers,
        )
        self.assertEqual(course_response.status_code, 201)
        course = course_response.get_json()['data']

        enrollment_response = self.client.post(
            '/api/enrollments',
            json={'studentId': student['id'], 'courseId': course['id']},
            headers=headers,
        )
        self.assertEqual(enrollment_response.status_code, 201)
        enrollment = enrollment_response.get_json()['data']

        grade_response = self.client.post(
            f"/api/enrollments/{enrollment['id']}/grades",
            json={'weekNumber': 1, 'grade': 'B', 'notes': 'Fondasi sudah baik'},
            headers=headers,
        )
        self.assertEqual(grade_response.status_code, 201)
        self.assertEqual(grade_response.get_json()['data']['weeklyGrades'][0]['score'], 80)
        self.assertEqual(grade_response.get_json()['data']['weeklyGrades'][0]['grade'], 'B')

        duplicate_grade = self.client.post(
            f"/api/enrollments/{enrollment['id']}/grades",
            json={'weekNumber': 1, 'grade': 'A'},
            headers=headers,
        )
        self.assertEqual(duplicate_grade.status_code, 409)

        invalid_grade = self.client.post(
            f"/api/enrollments/{enrollment['id']}/grades",
            json={'weekNumber': 2, 'grade': 'E'},
            headers=headers,
        )
        self.assertEqual(invalid_grade.status_code, 400)

    def test_student_session_includes_only_own_enrollments(self):
        student = self.register_student()
        login_data = self.login()
        headers = {'X-CSRF-Token': login_data['csrfToken']}
        course = self.client.post(
            '/api/courses',
            json={'name': 'Web Dasar'},
            headers=headers,
        ).get_json()['data']
        self.client.post(
            '/api/enrollments',
            json={'studentId': student['id'], 'courseId': course['id']},
            headers=headers,
        )
        self.client.post('/api/admin/logout', headers=headers)

        student_login = self.student_login()
        session_response = self.client.get('/api/student/session')
        self.assertEqual(session_response.status_code, 200)
        self.assertEqual(session_response.get_json()['student']['id'], student['id'])
        self.assertEqual(session_response.get_json()['student']['courses'][0]['courseName'], 'Web Dasar')
        self.assertTrue(student_login['csrfToken'])


if __name__ == '__main__':
    unittest.main()
