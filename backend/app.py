import os
import secrets
import smtplib
import time
from datetime import timedelta
from datetime import datetime, timezone
from email.message import EmailMessage
from functools import wraps
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, current_app, g, jsonify, request, session
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

db = SQLAlchemy()
_rate_limit_state = {}


def rate_limit(key, limit, window_seconds):
    if not current_app.config.get('RATE_LIMIT_ENABLED', True):
        return True
    now = time.monotonic()
    timestamps = [stamp for stamp in _rate_limit_state.get(key, []) if now - stamp < window_seconds]
    if len(timestamps) >= limit:
        _rate_limit_state[key] = timestamps
        return False
    timestamps.append(now)
    _rate_limit_state[key] = timestamps
    return True


def get_database_uri():
    if os.getenv('USE_SQLITE', 'false').lower() == 'true':
        sqlite_path = os.getenv(
            'SQLITE_DATABASE_PATH',
            str(Path(__file__).resolve().parent / 'instance' / 'course_platform.db'),
        )
        sqlite_path_obj = Path(sqlite_path)
        if not sqlite_path_obj.is_absolute():
            sqlite_path_obj = Path(__file__).resolve().parent.parent / sqlite_path_obj
        return f"sqlite:///{sqlite_path_obj.resolve().as_posix()}"

    database_url = os.getenv('DATABASE_URL')
    if database_url:
        if database_url.startswith('postgres://'):
            return database_url.replace('postgres://', 'postgresql://', 1)
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
    return [origin.strip() for origin in (value or '').split(',') if origin.strip()]


def allowed_origins_from_environment():
    configured = as_origins(os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:5173'))
    # Keep the public Vercel frontend usable when dashboard variables are stale.
    public_frontend = 'https://kursus-coding-6rz1.vercel.app'
    if public_frontend not in configured:
        configured.append(public_frontend)
    return configured


def validate_runtime_configuration(app):
    if app.config['APP_ENV'] != 'production':
        return

    secret_key = app.config['SECRET_KEY']
    if not secret_key or len(secret_key) < 32:
        raise RuntimeError('SECRET_KEY production harus diatur dan memiliki minimal 32 karakter.')
    if not app.config['SESSION_COOKIE_SECURE']:
        raise RuntimeError('SESSION_COOKIE_SECURE harus bernilai true pada production.')
    if not app.config['CORS_ALLOWED_ORIGINS']:
        raise RuntimeError('CORS_ALLOWED_ORIGINS harus diatur pada production.')


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


class StudentPasswordResetToken(db.Model):
    __tablename__ = 'student_password_reset_tokens'
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    token_hash = db.Column(db.String(64), unique=True, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, server_default=text('CURRENT_TIMESTAMP'))

    student = db.relationship('Student', backref=db.backref('password_reset_tokens', lazy=True, cascade='all, delete-orphan'))


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


class Course(db.Model):
    __tablename__ = 'courses'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False, unique=True)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(30), nullable=False, default='aktif')
    created_at = db.Column(db.DateTime, server_default=text('CURRENT_TIMESTAMP'))

    enrollments = db.relationship('Enrollment', backref='course', lazy=True, cascade='all, delete-orphan')


class Enrollment(db.Model):
    __tablename__ = 'enrollments'
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id'), nullable=False)
    status = db.Column(db.String(30), nullable=False, default='aktif')
    enrolled_at = db.Column(db.DateTime, server_default=text('CURRENT_TIMESTAMP'))
    __table_args__ = (db.UniqueConstraint('student_id', 'course_id', name='uq_enrollment_student_course'),)

    student = db.relationship('Student', backref=db.backref('enrollments', lazy=True))
    weekly_grades = db.relationship('WeeklyGrade', backref='enrollment', lazy=True, cascade='all, delete-orphan')


class WeeklyGrade(db.Model):
    __tablename__ = 'weekly_grades'
    id = db.Column(db.Integer, primary_key=True)
    enrollment_id = db.Column(db.Integer, db.ForeignKey('enrollments.id'), nullable=False)
    week_number = db.Column(db.Integer, nullable=False)
    score = db.Column(db.Integer, nullable=False)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, server_default=text('CURRENT_TIMESTAMP'))
    __table_args__ = (
        db.UniqueConstraint('enrollment_id', 'week_number', name='uq_weekly_grade_enrollment_week'),
        db.CheckConstraint('week_number >= 1', name='ck_weekly_grade_week_positive'),
        db.CheckConstraint('score IN (100, 80, 75, 60)', name='ck_weekly_grade_score_grade'),
    )


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
        'courses': [serialize_enrollment(enrollment) for enrollment in student.enrollments],
    }


def serialize_announcement(item):
    return {
        'id': item.id,
        'title': item.title,
        'content': item.content,
        'createdAt': item.created_at.strftime('%Y-%m-%d %H:%M:%S') if item.created_at else None,
    }


def serialize_course(course):
    return {
        'id': course.id,
        'name': course.name,
        'description': course.description,
        'status': course.status,
        'createdAt': course.created_at.strftime('%Y-%m-%d %H:%M:%S') if course.created_at else None,
    }


def score_to_grade(score):
    return {100: 'A', 80: 'B', 75: 'C', 60: 'D'}.get(score)


def hash_reset_token(token):
    import hashlib
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


def send_password_reset_email(app, recipient, reset_url):
    host = app.config.get('MAIL_SERVER')
    port = app.config.get('MAIL_PORT')
    username = app.config.get('MAIL_USERNAME')
    password = app.config.get('MAIL_PASSWORD')
    sender = app.config.get('MAIL_FROM') or username
    if not all((host, port, username, password, sender)):
        app.logger.error('Konfigurasi SMTP belum lengkap; email reset tidak dikirim.')
        return False

    message = EmailMessage()
    message['Subject'] = 'Atur ulang password akun murid'
    message['From'] = sender
    message['To'] = recipient
    message.set_content(
        'Kami menerima permintaan untuk mengatur ulang password akun murid Anda.\n\n'
        f'Buka tautan berikut dalam waktu 30 menit:\n{reset_url}\n\n'
        'Jika Anda tidak meminta perubahan ini, abaikan email ini.'
    )
    try:
        with smtplib.SMTP(host, port, timeout=10) as server:
            server.starttls()
            server.login(username, password)
            server.send_message(message)
        return True
    except Exception:
        app.logger.exception('Pengiriman email reset password gagal.')
        return False


def serialize_enrollment(enrollment, include_grades=True):
    data = {
        'id': enrollment.id,
        'studentId': enrollment.student_id,
        'studentName': enrollment.student.full_name if enrollment.student else None,
        'courseId': enrollment.course_id,
        'courseName': enrollment.course.name if enrollment.course else None,
        'status': enrollment.status,
        'enrolledAt': enrollment.enrolled_at.strftime('%Y-%m-%d %H:%M:%S') if enrollment.enrolled_at else None,
    }
    if include_grades:
        data['weeklyGrades'] = [
            {
                'id': grade.id,
                'weekNumber': grade.week_number,
                'score': grade.score,
                'grade': score_to_grade(grade.score),
                'notes': grade.notes,
                'createdAt': grade.created_at.strftime('%Y-%m-%d %H:%M:%S') if grade.created_at else None,
            }
            for grade in sorted(enrollment.weekly_grades, key=lambda item: item.week_number)
        ]
    return data


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

    app_env = os.getenv('APP_ENV', 'development').lower()
    auto_create_schema_default = 'false' if app_env == 'production' else 'true'
    app = Flask(__name__)
    app.config.from_mapping(
        APP_ENV=app_env,
        SECRET_KEY=secret_key,
        SQLALCHEMY_DATABASE_URI=get_database_uri(),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        MAX_CONTENT_LENGTH=1024 * 1024,
        RATE_LIMIT_ENABLED=True,
        AUTO_CREATE_SCHEMA=as_bool(os.getenv('AUTO_CREATE_SCHEMA', auto_create_schema_default)),
        SESSION_COOKIE_NAME='course_admin_session',
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SECURE=as_bool(os.getenv('SESSION_COOKIE_SECURE', 'false')),
        # The production frontend and API use different Vercel origins, so the
        # session cookie must be sent on credentialed cross-origin requests.
        SESSION_COOKIE_SAMESITE=os.getenv(
            'SESSION_COOKIE_SAMESITE',
            'None' if app_env == 'production' else 'Lax',
        ),
        PERMANENT_SESSION_LIFETIME=timedelta(hours=int(os.getenv('SESSION_LIFETIME_HOURS', '8'))),
        CORS_ALLOWED_ORIGINS=allowed_origins_from_environment(),
        ADMIN_BOOTSTRAP_USERNAME=os.getenv('ADMIN_BOOTSTRAP_USERNAME'),
        ADMIN_BOOTSTRAP_PASSWORD=os.getenv('ADMIN_BOOTSTRAP_PASSWORD'),
        MAIL_SERVER=os.getenv('MAIL_SERVER'),
        MAIL_PORT=int(os.getenv('MAIL_PORT', '587')),
        MAIL_USERNAME=os.getenv('MAIL_USERNAME'),
        MAIL_PASSWORD=os.getenv('MAIL_PASSWORD'),
        MAIL_FROM=os.getenv('MAIL_FROM'),
        FRONTEND_URL=os.getenv('FRONTEND_URL', 'http://localhost:5173'),
    )
    if test_config:
        app.config.update(test_config)

    if app.config['SQLALCHEMY_DATABASE_URI'].startswith('sqlite:///'):
        database_path = Path(app.config['SQLALCHEMY_DATABASE_URI'][10:])
        if str(database_path) != ':memory:':
            database_path.parent.mkdir(parents=True, exist_ok=True)

    validate_runtime_configuration(app)
    db.init_app(app)
    CORS(
        app,
        resources={r'/api/*': {'origins': app.config['CORS_ALLOWED_ORIGINS']}},
        origins=app.config['CORS_ALLOWED_ORIGINS'],
        supports_credentials=True,
        allow_headers=['Content-Type', 'X-CSRF-Token'],
    )

    with app.app_context():
        if app.config['AUTO_CREATE_SCHEMA']:
            db.create_all()
            ensure_student_login_schema()
            username = app.config.get('ADMIN_BOOTSTRAP_USERNAME')
            password = app.config.get('ADMIN_BOOTSTRAP_PASSWORD')
            if username and password:
                bootstrap_admin = AdminUser.query.filter_by(username=username).first()
                if bootstrap_admin:
                    bootstrap_admin.password_hash = generate_password_hash(password)
                else:
                    db.session.add(AdminUser(username=username, password_hash=generate_password_hash(password)))
                db.session.commit()

    @app.after_request
    def apply_security_headers(response):
        response.headers.setdefault('X-Content-Type-Options', 'nosniff')
        response.headers.setdefault('X-Frame-Options', 'DENY')
        response.headers.setdefault('Referrer-Policy', 'strict-origin-when-cross-origin')
        return response

    @app.route('/api/health', methods=['GET'])
    def health_check():
        try:
            db.session.execute(text('SELECT 1'))
        except Exception:
            db.session.rollback()
            app.logger.exception('Pemeriksaan kesehatan database gagal.')
            return jsonify({'ok': False, 'message': 'Database belum siap.'}), 503

        return jsonify({'ok': True, 'message': 'API aktif', 'database': 'ready'})

    @app.route('/api/admin/login', methods=['POST'])
    def admin_login():
        if not rate_limit(f'admin-login:{request.remote_addr}', 10, 300):
            return jsonify({'ok': False, 'message': 'Terlalu banyak percobaan login. Coba lagi beberapa menit.'}), 429
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
        if not rate_limit(f'student-login:{request.remote_addr}', 10, 300):
            return jsonify({'ok': False, 'message': 'Terlalu banyak percobaan login. Coba lagi beberapa menit.'}), 429
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

    @app.route('/api/student/forgot-password', methods=['POST'])
    def student_forgot_password():
        if not rate_limit(f'student-forgot-password:{request.remote_addr}', 5, 3600):
            return jsonify({'ok': False, 'message': 'Terlalu banyak permintaan. Coba lagi nanti.'}), 429
        payload = request.get_json(silent=True) or {}
        email = (payload.get('email') or '').strip().lower()
        generic_message = 'Jika email terdaftar, tautan pengaturan ulang password telah dikirim.'
        if not email or len(email) > 150:
            return jsonify({'ok': True, 'message': generic_message})

        student = Student.query.filter_by(email=email).first()
        if student:
            raw_token = secrets.token_urlsafe(32)
            reset_token = StudentPasswordResetToken(
                student_id=student.id,
                token_hash=hash_reset_token(raw_token),
                expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=30),
            )
            db.session.add(reset_token)
            db.session.commit()
            reset_url = f"{app.config['FRONTEND_URL'].rstrip('/')}/murid?resetToken={raw_token}"
            if not send_password_reset_email(app, student.email, reset_url):
                db.session.delete(reset_token)
                db.session.commit()
        return jsonify({'ok': True, 'message': generic_message})

    @app.route('/api/student/reset-password', methods=['POST'])
    def student_reset_password():
        payload = request.get_json(silent=True) or {}
        token = (payload.get('token') or '').strip()
        password = payload.get('password') or ''
        if not token or len(password) < 8:
            return jsonify({'ok': False, 'message': 'Token dan password minimal 8 karakter wajib diisi.'}), 400

        reset_token = StudentPasswordResetToken.query.filter_by(
            token_hash=hash_reset_token(token), used_at=None,
        ).first()
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        if not reset_token or reset_token.expires_at <= now:
            return jsonify({'ok': False, 'message': 'Tautan reset tidak valid atau sudah kedaluwarsa.'}), 400

        reset_token.student.password_hash = generate_password_hash(password)
        reset_token.used_at = now
        db.session.commit()
        return jsonify({'ok': True, 'message': 'Password berhasil diubah. Silakan login kembali.'})

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
        if len(title) > 200 or len(content) > 10000:
            return jsonify({'ok': False, 'message': 'Judul atau isi pengumuman terlalu panjang.'}), 400

        item = Announcement(title=title, content=content)
        db.session.add(item)
        db.session.commit()
        return jsonify({'ok': True, 'data': serialize_announcement(item)})

    @app.route('/api/courses', methods=['GET'])
    def get_courses():
        courses = Course.query.order_by(Course.created_at.desc()).all()
        return jsonify({'items': [serialize_course(course) for course in courses]})

    @app.route('/api/courses', methods=['POST'])
    @admin_required
    @csrf_protected
    def create_course():
        payload = request.get_json(silent=True) or {}
        name = (payload.get('name') or '').strip()
        description = (payload.get('description') or '').strip()
        status = (payload.get('status') or 'aktif').strip().lower()
        if not name or len(name) > 150:
            return jsonify({'ok': False, 'message': 'Nama kursus wajib diisi dan maksimal 150 karakter.'}), 400
        if status not in {'aktif', 'nonaktif'}:
            return jsonify({'ok': False, 'message': 'Status kursus tidak valid.'}), 400
        if Course.query.filter(db.func.lower(Course.name) == name.lower()).first():
            return jsonify({'ok': False, 'message': 'Nama kursus sudah digunakan.'}), 409
        course = Course(name=name, description=description or None, status=status)
        db.session.add(course)
        db.session.commit()
        return jsonify({'ok': True, 'data': serialize_course(course)}), 201

    @app.route('/api/enrollments', methods=['GET'])
    @admin_required
    def get_enrollments():
        enrollments = Enrollment.query.order_by(Enrollment.enrolled_at.desc()).all()
        return jsonify({'items': [serialize_enrollment(item) for item in enrollments]})

    @app.route('/api/enrollments', methods=['POST'])
    @admin_required
    @csrf_protected
    def create_enrollment():
        payload = request.get_json(silent=True) or {}
        try:
            student_id = int(payload.get('studentId'))
            course_id = int(payload.get('courseId'))
        except (TypeError, ValueError):
            return jsonify({'ok': False, 'message': 'studentId dan courseId harus berupa angka.'}), 400
        student = db.session.get(Student, student_id)
        course = db.session.get(Course, course_id)
        if not student or not course:
            return jsonify({'ok': False, 'message': 'Siswa atau kursus tidak ditemukan.'}), 404
        if course.status != 'aktif':
            return jsonify({'ok': False, 'message': 'Kursus tidak sedang aktif.'}), 400
        if Enrollment.query.filter_by(student_id=student.id, course_id=course.id).first():
            return jsonify({'ok': False, 'message': 'Siswa sudah terdaftar pada kursus ini.'}), 409
        enrollment = Enrollment(student_id=student.id, course_id=course.id)
        db.session.add(enrollment)
        db.session.commit()
        return jsonify({'ok': True, 'data': serialize_enrollment(enrollment)}), 201

    @app.route('/api/enrollments/<int:enrollment_id>/grades', methods=['POST'])
    @admin_required
    @csrf_protected
    def add_weekly_grade(enrollment_id):
        enrollment = db.session.get(Enrollment, enrollment_id)
        if not enrollment:
            return jsonify({'ok': False, 'message': 'Pendaftaran kursus tidak ditemukan.'}), 404
        payload = request.get_json(silent=True) or {}
        try:
            week_number = int(payload.get('weekNumber'))
        except (TypeError, ValueError):
            return jsonify({'ok': False, 'message': 'Minggu harus berupa angka.'}), 400
        score_map = {'A': 100, 'B': 80, 'C': 75, 'D': 60}
        grade_value = str(payload.get('grade') or '').strip().upper()
        if grade_value:
            score = score_map.get(grade_value)
        else:
            try:
                score = int(payload.get('score'))
            except (TypeError, ValueError):
                score = None
        notes = (payload.get('notes') or '').strip()
        if week_number < 1 or week_number > 52:
            return jsonify({'ok': False, 'message': 'Minggu harus berada di antara 1 dan 52.'}), 400
        if score not in score_map.values():
            return jsonify({'ok': False, 'message': 'Nilai harus berupa A, B, C, atau D.'}), 400
        if WeeklyGrade.query.filter_by(enrollment_id=enrollment.id, week_number=week_number).first():
            return jsonify({'ok': False, 'message': 'Nilai untuk minggu tersebut sudah ada.'}), 409
        grade = WeeklyGrade(
            enrollment_id=enrollment.id,
            week_number=week_number,
            score=score,
            notes=notes or None,
        )
        db.session.add(grade)
        db.session.commit()
        return jsonify({'ok': True, 'data': serialize_enrollment(enrollment)}), 201

    @app.route('/api/students', methods=['GET'])
    @admin_required
    def get_students():
        students = Student.query.order_by(Student.created_at.desc()).all()
        return jsonify({'items': [serialize_student(student) for student in students]})

    @app.route('/api/students/register', methods=['POST'])
    def register_student():
        if not rate_limit(f'student-register:{request.remote_addr}', 5, 3600):
            return jsonify({'ok': False, 'message': 'Terlalu banyak pendaftaran dari alamat ini. Coba lagi nanti.'}), 429
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
        if len(full_name) > 150 or len(email) > 150 or len(phone) > 30 or len(school) > 150:
            return jsonify({'ok': False, 'message': 'Data siswa melebihi batas panjang.'}), 400
        if len(notes) > 10000:
            return jsonify({'ok': False, 'message': 'Catatan siswa terlalu panjang.'}), 400
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
        if len(subject) > 100 or len(notes) > 10000:
            return jsonify({'ok': False, 'message': 'Mata pelajaran atau catatan terlalu panjang.'}), 400

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
