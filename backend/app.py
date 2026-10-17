import os
import secrets
from datetime import timedelta
from functools import wraps

from dotenv import load_dotenv
from flask import Flask, g, jsonify, request, session
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

db = SQLAlchemy()


def get_database_uri():
    if os.getenv('USE_SQLITE', 'false').lower() == 'true':
        return 'sqlite:///course_platform.db'

    database_url = os.getenv('DATABASE_URL')
    if database_url:
        return database_url

    db_user = os.getenv('DB_USER', 'root')
    db_password = os.getenv('DB_PASSWORD', 'password')
    db_host = os.getenv('DB_HOST', 'localhost')
    db_port = os.getenv('DB_PORT', '3306')
    db_name = os.getenv('DB_NAME', 'kelas_ngoding')
    return f'mysql+pymysql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}'


def as_bool(value):
    return str(value).lower() == 'true'


def as_origins(value):
    return [origin.strip() for origin in value.split(',') if origin.strip()]


class AdminUser(db.Model):
    __tablename__ = 'admin_users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, server_default=text('CURRENT_TIMESTAMP'))

    def __init__(self, username: str, password_hash: str):
        self.username = username
        self.password_hash = password_hash


class Student(db.Model):
    __tablename__ = 'students'
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    username = db.Column(db.String(64), unique=True, nullable=True)
    password_hash = db.Column(db.String(255), nullable=True)
    phone = db.Column(db.String(30), nullable=True)
    school = db.Column(db.String(150), nullable=True)
    interest_level = db.Column(db.String(50), default='Pemula')
    notes = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(50), default='baru')
    created_at = db.Column(db.DateTime, server_default=text('CURRENT_TIMESTAMP'))

    progress = db.relationship('StudentProgress', backref='student', lazy=True, cascade='all, delete-orphan')

    def __init__(
        self,
        full_name: str,
        email: str,
        username: str | None = None,
        password_hash: str | None = None,
        phone: str | None = None,
        school: str | None = None,
        interest_level: str = 'Pemula',
        notes: str | None = None,
        status: str = 'baru',
    ):
        self.full_name = full_name
        self.email = email
        self.username = username
        self.password_hash = password_hash
        self.phone = phone
        self.school = school
        self.interest_level = interest_level
        self.notes = notes
        self.status = status


class Announcement(db.Model):
    __tablename__ = 'announcements'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, server_default=text('CURRENT_TIMESTAMP'))

    def __init__(self, title: str, content: str):
        self.title = title
        self.content = content


class StudentProgress(db.Model):
    __tablename__ = 'student_progress'
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    subject = db.Column(db.String(100), nullable=False)
    score = db.Column(db.Integer, nullable=False)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, server_default=text('CURRENT_TIMESTAMP'))

    def __init__(self, student_id: int, subject: str, score: int, notes: str | None = None):
        self.student_id = student_id
        self.subject = subject
        self.score = score
        self.notes = notes


def serialize_student(student):
    return {
        'id': student.id,
        'fullName': student.full_name,
        'email': student.email,
        'username': student.username,
        'phone': student.phone,
        'school': student.school,
        'interestLevel': student.interest_level,
        'notes': student.notes,
        'status': student.status,
        'createdAt': student.created_at.strftime('%Y-%m-%d %H:%M:%S') if student.created_at else None,
        'progress': [
            {
                'id': item.id,
                'subject': item.subject,
                'score': item.score,
                'notes': item.notes,
                'createdAt': item.created_at.strftime('%Y-%m-%d %H:%M:%S') if item.created_at else None,
            }
            for item in student.progress
        ],
    }


def serialize_announcement(item):
    return {
        'id': item.id,
        'title': item.title,
        'content': item.content,
        'createdAt': item.created_at.strftime('%Y-%m-%d %H:%M:%S') if item.created_at else None,
    }


def admin_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        admin_id = session.get('admin_id')
        admin = db.session.get(AdminUser, admin_id) if admin_id else None
        if not admin:
            session.clear()
            return jsonify({'ok': False, 'message': 'Silakan login sebagai admin terlebih dahulu.'}), 401

        g.admin = admin
        return view(*args, **kwargs)

    return wrapped


def csrf_protected(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        csrf_token = request.headers.get('X-CSRF-Token', '')
        expected_token = session.get('csrf_token', '')
        if not expected_token or not secrets.compare_digest(csrf_token, expected_token):
            return jsonify({'ok': False, 'message': 'Token keamanan tidak valid.'}), 403
        return view(*args, **kwargs)

    return wrapped


def student_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        student_id = session.get('student_id')
        student = db.session.get(Student, student_id) if student_id else None
        if not student:
            session.clear()
            return jsonify({'ok': False, 'message': 'Silakan login sebagai murid terlebih dahulu.'}), 401

        g.student = student
        return view(*args, **kwargs)

    return wrapped


def ensure_student_login_schema():
    inspector = inspect(db.engine)
    columns = {column['name'] for column in inspector.get_columns('students')}
    statements = []
    if 'username' not in columns:
        statements.append('ALTER TABLE students ADD COLUMN username VARCHAR(64)')
    if 'password_hash' not in columns:
        statements.append('ALTER TABLE students ADD COLUMN password_hash VARCHAR(255)')

    for statement in statements:
        db.session.execute(text(statement))
    if statements:
        db.session.commit()

    inspector = inspect(db.engine)
    unique_username = any(
        index.get('unique') and 'username' in index.get('column_names', [])
        for index in inspector.get_indexes('students')
    ) or any(
        'username' in constraint.get('column_names', [])
        for constraint in inspector.get_unique_constraints('students')
    )
    if not unique_username:
        db.session.execute(text('CREATE UNIQUE INDEX ix_students_username ON students (username)'))
        db.session.commit()


def create_app(test_config=None):
    secret_key = os.getenv('SECRET_KEY')
    if not secret_key and not test_config:
        raise RuntimeError('SECRET_KEY harus diatur pada environment sebelum menjalankan aplikasi.')

    app = Flask(__name__)
    app.config.from_mapping(
        SECRET_KEY=secret_key,
        SQLALCHEMY_DATABASE_URI=get_database_uri(),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        SESSION_COOKIE_NAME='course_admin_session',
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SECURE=as_bool(os.getenv('SESSION_COOKIE_SECURE', 'false')),
        SESSION_COOKIE_SAMESITE=os.getenv('SESSION_COOKIE_SAMESITE', 'Lax'),
        PERMANENT_SESSION_LIFETIME=timedelta(hours=int(os.getenv('SESSION_LIFETIME_HOURS', '8'))),
        CORS_ALLOWED_ORIGINS=as_origins(os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:5173')),
        ADMIN_BOOTSTRAP_USERNAME=os.getenv('ADMIN_BOOTSTRAP_USERNAME'),
        ADMIN_BOOTSTRAP_PASSWORD=os.getenv('ADMIN_BOOTSTRAP_PASSWORD'),
    )
    if test_config:
        app.config.update(test_config)

    db.init_app(app)
    CORS(
        app,
        origins=app.config['CORS_ALLOWED_ORIGINS'],
        supports_credentials=True,
        allow_headers=['Content-Type', 'X-CSRF-Token'],
    )

    with app.app_context():
        db.create_all()
        ensure_student_login_schema()
        username = app.config.get('ADMIN_BOOTSTRAP_USERNAME')
        password = app.config.get('ADMIN_BOOTSTRAP_PASSWORD')
        if username and password and not AdminUser.query.first():
            db.session.add(AdminUser(username=username, password_hash=generate_password_hash(password)))
            db.session.commit()

    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({'ok': True, 'message': 'API aktif'})

    @app.route('/api/admin/login', methods=['POST'])
    def admin_login():
        payload = request.get_json(silent=True) or {}
        username = (payload.get('username') or '').strip()
        password = payload.get('password') or ''

        user = AdminUser.query.filter_by(username=username).first()
        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({'ok': False, 'message': 'Username atau password salah'}), 401

        session.clear()
        session.permanent = True
        session['admin_id'] = user.id
        session['csrf_token'] = secrets.token_urlsafe(32)
        return jsonify({
            'ok': True,
            'username': user.username,
            'csrfToken': session['csrf_token'],
            'message': 'Login berhasil',
        })

    @app.route('/api/admin/session', methods=['GET'])
    def admin_session():
        admin_id = session.get('admin_id')
        user = db.session.get(AdminUser, admin_id) if admin_id else None
        if not user:
            session.clear()
            return jsonify({'ok': True, 'authenticated': False})

        return jsonify({
            'ok': True,
            'authenticated': True,
            'username': user.username,
            'csrfToken': session.get('csrf_token'),
        })

    @app.route('/api/admin/logout', methods=['POST'])
    @admin_required
    @csrf_protected
    def admin_logout():
        session.clear()
        return jsonify({'ok': True, 'message': 'Logout berhasil'})

    @app.route('/api/student/login', methods=['POST'])
    def student_login():
        payload = request.get_json(silent=True) or {}
        username = (payload.get('username') or '').strip().lower()
        password = payload.get('password') or ''

        student = Student.query.filter_by(username=username).first()
        if not student or not student.password_hash or not check_password_hash(student.password_hash, password):
            return jsonify({'ok': False, 'message': 'Username atau password murid salah'}), 401

        session.clear()
        session.permanent = True
        session['student_id'] = student.id
        session['csrf_token'] = secrets.token_urlsafe(32)
        return jsonify({
            'ok': True,
            'student': serialize_student(student),
            'csrfToken': session['csrf_token'],
            'message': 'Login murid berhasil',
        })

    @app.route('/api/student/session', methods=['GET'])
    def student_session():
        student_id = session.get('student_id')
        student = db.session.get(Student, student_id) if student_id else None
        if not student:
            session.clear()
            return jsonify({'ok': True, 'authenticated': False})

        return jsonify({
            'ok': True,
            'authenticated': True,
            'student': serialize_student(student),
            'csrfToken': session.get('csrf_token'),
        })

    @app.route('/api/student/logout', methods=['POST'])
    @student_required
    @csrf_protected
    def student_logout():
        session.clear()
        return jsonify({'ok': True, 'message': 'Logout murid berhasil'})

    @app.route('/api/student/profile', methods=['GET'])
    @student_required
    def student_profile():
        return jsonify({'ok': True, 'data': serialize_student(g.student)})

    @app.route('/api/announcements', methods=['GET'])
    def get_announcements():
        announcements = Announcement.query.order_by(Announcement.created_at.desc()).all()
        return jsonify({'items': [serialize_announcement(item) for item in announcements]})

    @app.route('/api/announcements', methods=['POST'])
    @admin_required
    @csrf_protected
    def create_announcement():
        payload = request.get_json(silent=True) or {}
        title = (payload.get('title') or '').strip()
        content = (payload.get('content') or '').strip()

        if not title or not content:
            return jsonify({'ok': False, 'message': 'Judul dan isi pengumuman harus diisi'}), 400

        item = Announcement(title=title, content=content)
        db.session.add(item)
        db.session.commit()
        return jsonify({'ok': True, 'data': serialize_announcement(item)})

    @app.route('/api/students', methods=['GET'])
    @admin_required
    def get_students():
        students = Student.query.order_by(Student.created_at.desc()).all()
        return jsonify({'items': [serialize_student(student) for student in students]})

    @app.route('/api/students/register', methods=['POST'])
    def register_student():
        payload = request.get_json(silent=True) or {}
        full_name = (payload.get('fullName') or '').strip()
        email = (payload.get('email') or '').strip().lower()
        username = (payload.get('username') or '').strip().lower()
        password = payload.get('password') or ''
        phone = (payload.get('phone') or '').strip()
        school = (payload.get('school') or '').strip()
        interest_level = (payload.get('interestLevel') or 'Pemula').strip()
        notes = (payload.get('notes') or '').strip()

        if not full_name or not email or not username or not password:
            return jsonify({'ok': False, 'message': 'Nama lengkap, email, username, dan password harus diisi'}), 400
        if len(username) < 3 or len(username) > 64 or not all(character.isalnum() or character in '._-' for character in username):
            return jsonify({'ok': False, 'message': 'Username harus 3-64 karakter dan hanya boleh berisi huruf, angka, titik, garis bawah, atau tanda hubung'}), 400
        if len(password) < 8:
            return jsonify({'ok': False, 'message': 'Password minimal terdiri dari 8 karakter'}), 400
        if Student.query.filter_by(email=email).first():
            return jsonify({'ok': False, 'message': 'Email sudah terdaftar'}), 409
        if Student.query.filter_by(username=username).first():
            return jsonify({'ok': False, 'message': 'Username sudah digunakan'}), 409

        student = Student(
            full_name=full_name,
            email=email,
            username=username,
            password_hash=generate_password_hash(password),
            phone=phone,
            school=school,
            interest_level=interest_level,
            notes=notes,
            status='baru',
        )
        db.session.add(student)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            return jsonify({'ok': False, 'message': 'Email atau username sudah digunakan'}), 409

        return jsonify({'ok': True, 'data': serialize_student(student)})

    @app.route('/api/students/<int:student_id>', methods=['GET'])
    @admin_required
    def get_student_detail(student_id):
        student = db.session.get(Student, student_id)
        if not student:
            return jsonify({'ok': False, 'message': 'Murid tidak ditemukan'}), 404
        return jsonify({'data': serialize_student(student)})

    @app.route('/api/students/<int:student_id>/progress', methods=['POST'])
    @admin_required
    @csrf_protected
    def add_student_progress(student_id):
        student = db.session.get(Student, student_id)
        if not student:
            return jsonify({'ok': False, 'message': 'Murid tidak ditemukan'}), 404

        payload = request.get_json(silent=True) or {}
        subject = (payload.get('subject') or '').strip()
        score_value = payload.get('score')
        notes = (payload.get('notes') or '').strip()

        if isinstance(score_value, bool) or not isinstance(score_value, (int, str)):
            return jsonify({'ok': False, 'message': 'Nilai harus berupa angka.'}), 400

        try:
            score = int(score_value)
        except ValueError:
            return jsonify({'ok': False, 'message': 'Nilai harus berupa angka.'}), 400

        if not subject:
            return jsonify({'ok': False, 'message': 'Mata pelajaran wajib diisi.'}), 400

        if score not in {100, 80, 75, 60}:
            return jsonify({'ok': False, 'message': 'Nilai harus salah satu dari A (100), B (80), C (75), atau D (60).'}), 400

        item = StudentProgress(student_id=student.id, subject=subject, score=score, notes=notes)
        db.session.add(item)
        db.session.commit()

        return jsonify({'ok': True, 'data': {
            'id': item.id,
            'studentId': item.student_id,
            'subject': item.subject,
            'score': item.score,
            'notes': item.notes,
            'createdAt': item.created_at.strftime('%Y-%m-%d %H:%M:%S') if item.created_at else None,
        }})

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=as_bool(os.getenv('FLASK_DEBUG', 'false')))
