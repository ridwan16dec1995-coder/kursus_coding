import { useEffect, useMemo, useState } from 'react'
import './App.css'

// Use the Vercel same-origin proxy in production so session cookies are first-party.
const API_BASE_URL = import.meta.env.DEV
  ? (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api')
  : '/api'

const emptyRegistration = {
  fullName: '',
  email: '',
  username: '',
  password: '',
  phone: '',
  school: '',
  interestLevel: 'Pemula',
  notes: '',
}

const BRAND_NAME = '<R/one> Code Accademy'

const emptyAnnouncement = {
  title: '',
  content: '',
}

const emptyLogin = {
  username: '',
  password: '',
}

const emptyStudentLogin = {
  username: '',
  password: '',
}

const emptyForgotPassword = { email: '' }
const emptyResetPassword = { password: '', confirmation: '' }

const emptyProgress = {
  studentId: '',
  subject: '',
  score: '',
  notes: '',
}

const emptyCourse = { name: '', description: '', status: 'aktif' }
const emptyEnrollment = { studentId: '', courseId: '' }
const emptyWeeklyGrade = { enrollmentId: '', weekNumber: '', grade: '', notes: '' }

const adminModules = [
  { id: 'ringkasan', label: 'Ringkasan' },
  { id: 'murid', label: 'Murid' },
  { id: 'progress', label: 'Progress Belajar' },
  { id: 'kursus', label: 'Kursus & Pendaftaran' },
  { id: 'pengumuman', label: 'Pengumuman' },
]

const gradeOptions = [
  {
    letter: 'A',
    score: 100,
    guidance: 'Sangat baik — murid dapat melanjutkan ke materi atau modul berikutnya.',
    action: 'Lanjut ke materi berikutnya',
    tone: 'excellent',
  },
  {
    letter: 'B',
    score: 80,
    guidance: 'Baik — murid dapat melanjutkan ke materi berikutnya sambil tetap berlatih.',
    action: 'Lanjut sambil tetap berlatih',
    tone: 'good',
  },
  {
    letter: 'C',
    score: 75,
    guidance: 'Perlu penguatan — murid perlu mengulang materi dan mendapat pendampingan sebelum melanjutkan.',
    action: 'Ulang materi dan pendampingan',
    tone: 'fair',
  },
  {
    letter: 'D',
    score: 60,
    guidance: 'Perlu perbaikan — murid wajib mengulang materi sebelum melanjutkan.',
    action: 'Ulang materi',
    tone: 'support',
  },
]

function getScoreCategory(score) {
  return gradeOptions.find((grade) => grade.score === Number(score)) || {
    letter: null,
    action: 'Nilai lama perlu ditinjau',
    guidance: 'Nilai ini perlu ditinjau oleh admin sebelum ada arahan belajar berikutnya.',
    tone: 'support',
  }
}

function getStudentProgressMessage(category) {
  if (category.letter === 'A' || category.letter === 'B') {
    return `Kamu dapat ${category.action.toLowerCase()}.`
  }

  return `Kamu perlu ${category.action.toLowerCase()}.`
}

function formatAssessmentDate(value) {
  if (!value) return 'Tanggal penilaian belum tersedia'

  const date = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getPortalFromPath() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path === '/admin') return 'admin'
  if (path === '/murid') return 'murid'
  return 'publik'
}

function App() {
  const [students, setStudents] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [loginForm, setLoginForm] = useState(emptyLogin)
  const [studentLoginForm, setStudentLoginForm] = useState(emptyStudentLogin)
  const [forgotPasswordForm, setForgotPasswordForm] = useState(emptyForgotPassword)
  const [resetPasswordForm, setResetPasswordForm] = useState(emptyResetPassword)
  const [registrationForm, setRegistrationForm] = useState(emptyRegistration)
  const [announcementForm, setAnnouncementForm] = useState(emptyAnnouncement)
  const [progressForm, setProgressForm] = useState(emptyProgress)
  const [courseForm, setCourseForm] = useState(emptyCourse)
  const [enrollmentForm, setEnrollmentForm] = useState(emptyEnrollment)
  const [weeklyGradeForm, setWeeklyGradeForm] = useState(emptyWeeklyGrade)
  const [courses, setCourses] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [admin, setAdmin] = useState(null)
  const [student, setStudent] = useState(null)
  const [studentSearch, setStudentSearch] = useState('')
  const [activeAdminView, setActiveAdminView] = useState('ringkasan')
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isStudentLoggingIn, setIsStudentLoggingIn] = useState(false)
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [portal, setPortal] = useState(getPortalFromPath)
  const [resetToken, setResetToken] = useState(() => new URLSearchParams(window.location.search).get('resetToken') || '')

  const isPublicPortal = portal === 'publik'
  const isAdminPortal = portal === 'admin'
  const isStudentPortal = portal === 'murid'

  const announceRegistrationSuccess = () => {
    if (!('speechSynthesis' in window)) return

    window.speechSynthesis.cancel()
    const announcement = new SpeechSynthesisUtterance(
      `Pendaftaran berhasil. Selamat datang di ${BRAND_NAME}.`,
    )
    announcement.lang = 'id-ID'
    announcement.rate = 0.95
    announcement.pitch = 1
    window.speechSynthesis.speak(announcement)
  }

  const navigateToPortal = (nextPortal, replace = false) => {
    const destination = nextPortal === 'admin' ? '/admin' : nextPortal === 'murid' ? '/murid' : '/'
    window.history[replace ? 'replaceState' : 'pushState']({}, '', destination)
    setPortal(nextPortal)
  }

  const clearAdminData = (text = '') => {
    setAdmin(null)
    setStudentSearch('')
    setActiveAdminView('ringkasan')
    setStudents([])
    setProgressForm(emptyProgress)
    setCourseForm(emptyCourse)
    setEnrollmentForm(emptyEnrollment)
    setWeeklyGradeForm(emptyWeeklyGrade)
    setCourses([])
    setEnrollments([])
    if (text) {
      setMessage({ type: 'error', text })
    }
  }

  const clearStudentData = (text = '') => {
    setStudent(null)
    if (text) {
      setMessage({ type: 'error', text })
    }
  }

  const fetchAnnouncements = async () => {
    const response = await fetch(`${API_BASE_URL}/announcements`)
    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || 'Gagal memuat pengumuman.')
    }

    setAnnouncements(result.items || [])
  }

  const fetchStudents = async () => {
    const response = await fetch(`${API_BASE_URL}/students`, { credentials: 'include' })
    const result = await response.json()

    if (response.status === 401) {
      clearAdminData('Sesi admin telah berakhir. Silakan login kembali.')
      return false
    }

    if (!response.ok) {
      throw new Error(result.message || 'Gagal memuat data murid.')
    }

    setStudents(result.items || [])
    return true
  }

  const fetchCourses = async () => {
    const response = await fetch(`${API_BASE_URL}/courses`)
    const result = await response.json()
    if (!response.ok) throw new Error(result.message || 'Gagal memuat kursus.')
    setCourses(result.items || [])
  }

  const fetchEnrollments = async () => {
    const response = await fetch(`${API_BASE_URL}/enrollments`, { credentials: 'include' })
    const result = await response.json()
    if (response.status === 401) {
      clearAdminData('Sesi admin telah berakhir. Silakan login kembali.')
      return false
    }
    if (!response.ok) throw new Error(result.message || 'Gagal memuat pendaftaran kursus.')
    setEnrollments(result.items || [])
    return true
  }

  useEffect(() => {
    const syncPortalWithHistory = () => setPortal(getPortalFromPath())
    window.addEventListener('popstate', syncPortalWithHistory)
    return () => window.removeEventListener('popstate', syncPortalWithHistory)
  }, [])

  useEffect(() => {
    const loadApplication = async () => {
      try {
        await fetchAnnouncements()
        await fetchCourses()
        const adminResponse = await fetch(`${API_BASE_URL}/admin/session`, { credentials: 'include' })
        const adminResult = await adminResponse.json()

        if (adminResponse.ok && adminResult.authenticated) {
          setAdmin({ username: adminResult.username, csrfToken: adminResult.csrfToken })
          await fetchStudents()
          await fetchEnrollments()
          navigateToPortal('admin', true)
          return
        }

        const studentResponse = await fetch(`${API_BASE_URL}/student/session`, { credentials: 'include' })
        const studentResult = await studentResponse.json()
        if (studentResponse.ok && studentResult.authenticated) {
          setStudent({ ...studentResult.student, csrfToken: studentResult.csrfToken })
          navigateToPortal('murid', true)
        }
      } catch (error) {
        console.error(error)
        setMessage({ type: 'error', text: error.message || 'Gagal memuat data dari server.' })
      } finally {
        setIsAuthLoading(false)
      }
    }

    loadApplication()
  }, [])

  const metrics = useMemo(() => {
    const totalScores = students.reduce((acc, item) => {
      const values = item.progress || []
      if (!values.length) return acc
      return acc + values.reduce((sum, progressItem) => sum + Number(progressItem.score || 0), 0)
    }, 0)

    const totalProgressEntries = students.reduce((count, item) => {
      return count + (item.progress || []).length
    }, 0)

    const averageScore = totalProgressEntries ? Math.round(totalScores / totalProgressEntries) : 0

    return {
      totalStudents: students.length,
      totalAnnouncements: announcements.length,
      averageScore,
    }
  }, [students, announcements])

  const filteredStudents = useMemo(() => {
    const searchTerm = studentSearch.trim().toLowerCase()
    if (!searchTerm) return students

    return students.filter((student) => [
      student.fullName,
      student.email,
      student.phone,
      student.school,
      student.interestLevel,
    ].some((value) => String(value || '').toLowerCase().includes(searchTerm)))
  }, [students, studentSearch])

  const progressRows = useMemo(() => {
    return filteredStudents
      .flatMap((student) => (student.progress || []).map((progress) => ({
        ...progress,
        studentName: student.fullName,
      })))
      .sort((first, second) => (second.createdAt || '').localeCompare(first.createdAt || ''))
  }, [filteredStudents])

  const handleLogin = async (event) => {
    event.preventDefault()
    setIsLoggingIn(true)

    try {
      const response = await fetch(`${API_BASE_URL}/admin/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      })
      const result = await response.json()

      if (!response.ok) {
        setMessage({ type: 'error', text: result.message || 'Login gagal.' })
        return
      }

      setAdmin({ username: result.username, csrfToken: result.csrfToken })
      setActiveAdminView('ringkasan')
      navigateToPortal('admin')
      setLoginForm(emptyLogin)
      await fetchStudents()
      await fetchEnrollments()
      setMessage({ type: 'success', text: `Login berhasil sebagai ${result.username}.` })
    } catch (error) {
      console.error(error)
      setMessage({ type: 'error', text: 'Login gagal. Coba lagi.' })
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleLogout = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRF-Token': admin.csrfToken },
      })
      const result = await response.json()
      setMessage({
        type: response.ok ? 'success' : 'error',
        text: response.ok ? 'Logout berhasil.' : result.message || 'Logout tidak dapat diselesaikan.',
      })
    } catch (error) {
      console.error(error)
      setMessage({ type: 'error', text: 'Logout tidak dapat diselesaikan, tetapi akses lokal telah dibersihkan.' })
    } finally {
      clearAdminData()
      navigateToPortal('publik')
    }
  }

  const handleStudentLogin = async (event) => {
    event.preventDefault()
    setIsStudentLoggingIn(true)

    try {
      const response = await fetch(`${API_BASE_URL}/student/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentLoginForm),
      })
      const result = await response.json()

      if (!response.ok) {
        setMessage({ type: 'error', text: result.message || 'Login murid gagal.' })
        return
      }

      setStudent({ ...result.student, csrfToken: result.csrfToken })
      setStudentLoginForm(emptyStudentLogin)
      navigateToPortal('murid')
      setMessage({ type: 'success', text: `Login berhasil. Selamat datang, ${result.student.fullName}.` })
    } catch (error) {
      console.error(error)
      setMessage({ type: 'error', text: 'Login murid gagal. Coba lagi.' })
    } finally {
      setIsStudentLoggingIn(false)
    }
  }

  const handleForgotPassword = async (event) => {
    event.preventDefault()
    setIsSendingReset(true)
    try {
      const response = await fetch(`${API_BASE_URL}/student/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(forgotPasswordForm),
      })
      const result = await response.json()
      setMessage({ type: response.ok ? 'success' : 'error', text: result.message || 'Permintaan reset gagal.' })
      if (response.ok) {
        setForgotPasswordForm(emptyForgotPassword)
        setShowForgotPassword(false)
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Permintaan reset gagal. Coba lagi.' })
    } finally {
      setIsSendingReset(false)
    }
  }

  const handleResetPassword = async (event) => {
    event.preventDefault()
    if (resetPasswordForm.password !== resetPasswordForm.confirmation) {
      setMessage({ type: 'error', text: 'Konfirmasi password tidak cocok.' })
      return
    }
    setIsResettingPassword(true)
    try {
      const response = await fetch(`${API_BASE_URL}/student/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password: resetPasswordForm.password }),
      })
      const result = await response.json()
      setMessage({ type: response.ok ? 'success' : 'error', text: result.message || 'Password gagal diubah.' })
      if (response.ok) {
        setResetPasswordForm(emptyResetPassword)
        setResetToken('')
        window.history.replaceState({}, '', '/murid')
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Password gagal diubah. Coba lagi.' })
    } finally {
      setIsResettingPassword(false)
    }
  }

  const handleStudentLogout = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/student/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRF-Token': student.csrfToken },
      })
      const result = await response.json()
      setMessage({
        type: response.ok ? 'success' : 'error',
        text: response.ok ? 'Logout murid berhasil.' : result.message || 'Logout murid tidak dapat diselesaikan.',
      })
    } catch (error) {
      console.error(error)
      setMessage({ type: 'error', text: 'Logout murid tidak dapat diselesaikan, tetapi akses lokal telah dibersihkan.' })
    } finally {
      clearStudentData()
      navigateToPortal('publik')
    }
  }

  const handleRegister = async (event) => {
    event.preventDefault()

    try {
      const response = await fetch(`${API_BASE_URL}/students/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationForm),
      })
      const result = await response.json()

      if (!response.ok) {
        setMessage({ type: 'error', text: result.message || 'Pendaftaran gagal.' })
        return
      }

      setStudentLoginForm({ username: registrationForm.username, password: '' })
      setMessage({ type: 'success', text: 'Pendaftaran berhasil. Gunakan username dan password yang dibuat untuk login sebagai murid.' })
      announceRegistrationSuccess()
      setRegistrationForm(emptyRegistration)
      if (admin) {
        await fetchStudents()
      }
    } catch (error) {
      console.error(error)
      setMessage({ type: 'error', text: 'Pendaftaran gagal. Coba lagi.' })
    }
  }

  const handlePublishAnnouncement = async (event) => {
    event.preventDefault()

    try {
      const response = await fetch(`${API_BASE_URL}/announcements`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': admin.csrfToken,
        },
        body: JSON.stringify(announcementForm),
      })
      const result = await response.json()

      if (response.status === 401) {
        clearAdminData('Sesi admin telah berakhir. Silakan login kembali.')
        return
      }

      if (!response.ok) {
        setMessage({ type: 'error', text: result.message || 'Pengumuman gagal dibuat.' })
        return
      }

      setMessage({ type: 'success', text: 'Pengumuman berhasil dipublikasikan.' })
      setAnnouncementForm(emptyAnnouncement)
      await fetchAnnouncements()
    } catch (error) {
      console.error(error)
      setMessage({ type: 'error', text: 'Pengumuman gagal dibuat.' })
    }
  }

  const selectedGrade = gradeOptions.find((grade) => String(grade.score) === progressForm.score)

  const handleProgressSubmit = async (event) => {
    event.preventDefault()

    if (!progressForm.studentId) {
      setMessage({ type: 'error', text: 'Pilih murid terlebih dahulu.' })
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/students/${progressForm.studentId}/progress`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': admin.csrfToken,
        },
        body: JSON.stringify({
          subject: progressForm.subject,
          score: Number(progressForm.score),
          notes: progressForm.notes,
        }),
      })
      const result = await response.json()

      if (response.status === 401) {
        clearAdminData('Sesi admin telah berakhir. Silakan login kembali.')
        return
      }

      if (!response.ok) {
        setMessage({ type: 'error', text: result.message || 'Progress gagal disimpan.' })
        return
      }

      setMessage({ type: 'success', text: 'Nilai progress murid berhasil disimpan.' })
      setProgressForm(emptyProgress)
      await fetchStudents()
    } catch (error) {
      console.error(error)
      setMessage({ type: 'error', text: 'Progress gagal disimpan.' })
    }
  }

  const handleCourseSubmit = async (event) => {
    event.preventDefault()
    try {
      const response = await fetch(`${API_BASE_URL}/courses`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': admin.csrfToken },
        body: JSON.stringify(courseForm),
      })
      const result = await response.json()
      if (!response.ok) {
        setMessage({ type: 'error', text: result.message || 'Kursus gagal dibuat.' })
        return
      }
      setCourseForm(emptyCourse)
      setMessage({ type: 'success', text: 'Kursus berhasil dibuat.' })
      await fetchCourses()
    } catch (error) {
      console.error(error)
      setMessage({ type: 'error', text: 'Kursus gagal dibuat.' })
    }
  }

  const handleEnrollmentSubmit = async (event) => {
    event.preventDefault()
    try {
      const response = await fetch(`${API_BASE_URL}/enrollments`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': admin.csrfToken },
        body: JSON.stringify(enrollmentForm),
      })
      const result = await response.json()
      if (!response.ok) {
        setMessage({ type: 'error', text: result.message || 'Pendaftaran kursus gagal.' })
        return
      }
      setEnrollmentForm(emptyEnrollment)
      setMessage({ type: 'success', text: 'Siswa berhasil didaftarkan ke kursus.' })
      await Promise.all([fetchEnrollments(), fetchStudents()])
    } catch (error) {
      console.error(error)
      setMessage({ type: 'error', text: 'Pendaftaran kursus gagal.' })
    }
  }

  const handleWeeklyGradeSubmit = async (event) => {
    event.preventDefault()
    try {
      const response = await fetch(`${API_BASE_URL}/enrollments/${weeklyGradeForm.enrollmentId}/grades`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': admin.csrfToken },
        body: JSON.stringify({
          weekNumber: Number(weeklyGradeForm.weekNumber),
          grade: weeklyGradeForm.grade,
          notes: weeklyGradeForm.notes,
        }),
      })
      const result = await response.json()
      if (!response.ok) {
        setMessage({ type: 'error', text: result.message || 'Nilai mingguan gagal disimpan.' })
        return
      }
      setWeeklyGradeForm(emptyWeeklyGrade)
      setMessage({ type: 'success', text: 'Nilai mingguan berhasil disimpan.' })
      await Promise.all([fetchEnrollments(), fetchStudents()])
    } catch (error) {
      console.error(error)
      setMessage({ type: 'error', text: 'Nilai mingguan gagal disimpan.' })
    }
  }

  return (
    <div className="page-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Platform pembelajaran coding</p>
          <h1>{BRAND_NAME}</h1>
        </div>
        {!admin && !student && (
          <nav className="portal-links" aria-label="Portal aplikasi">
              <button type="button" className={isPublicPortal ? 'is-active' : ''} onClick={() => navigateToPortal('publik')}>Pendaftaran Umum</button>
            <button type="button" className={isStudentPortal ? 'is-active' : ''} onClick={() => navigateToPortal('murid')}>Portal Murid</button>
            <button type="button" className={isAdminPortal ? 'is-active' : ''} onClick={() => navigateToPortal('admin')}>Portal Admin</button>
          </nav>
        )}
        <div className="topbar-meta">
          {admin ? (
            <>
              <span className="status-chip success">Admin: {admin.username}</span>
              <button type="button" className="secondary-btn" onClick={handleLogout}>Keluar</button>
            </>
          ) : student ? (
            <>
              <span className="status-chip success">Murid: {student.fullName}</span>
              <button type="button" className="secondary-btn" onClick={handleStudentLogout}>Keluar</button>
            </>
          ) : (
            <span className="status-chip muted">{isAuthLoading ? 'Memeriksa sesi...' : 'Belum login'}</span>
          )}
        </div>
      </header>

      {message.text && (
        <div
          className={`alert ${message.type === 'success' ? 'success' : 'error'}`}
          role={message.type === 'success' ? 'status' : 'alert'}
          aria-live={message.type === 'success' ? 'polite' : 'assertive'}
        >
          {message.text}
        </div>
      )}

      {!admin && !student && (
        <main className="content-grid">
          {!isAuthLoading && (
            <>
          {isAdminPortal && (
          <section className="panel login-panel">
            <div className="login-brand">
              <div className="login-mark" aria-hidden="true">&lt;R/one&gt;</div>
              <div>
                <p className="login-eyebrow">Admin Portal</p>
                <h2>Selamat datang kembali</h2>
              </div>
            </div>
            <p className="login-description">Masuk untuk mengelola murid, pengumuman, dan progress belajar.</p>
            <form onSubmit={handleLogin} className="stacked-form login-form" aria-busy={isLoggingIn}>
              <label className="login-field" htmlFor="admin-username">
                Username
                <input
                  id="admin-username"
                  required
                  autoComplete="username"
                  value={loginForm.username}
                  onChange={(event) => setLoginForm({ ...loginForm, username: event.target.value })}
                />
              </label>
              <label className="login-field" htmlFor="admin-password">
                Password
                <input
                  id="admin-password"
                  required
                  type="password"
                  autoComplete="current-password"
                  value={loginForm.password}
                  onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                />
              </label>
              <button type="submit" className="primary-btn login-submit" disabled={isLoggingIn}>
                {isLoggingIn ? 'Memproses...' : 'Masuk ke dashboard'}
              </button>
            </form>
            <p className="login-security-note">Akses khusus untuk administrator {BRAND_NAME}.</p>
          </section>
          )}

          {isStudentPortal && resetToken && (
          <section className="panel login-panel student-login-panel">
            <div className="login-brand"><div className="login-mark" aria-hidden="true">Reset</div><div><p className="login-eyebrow">Pemulihan akun</p><h2>Buat password baru</h2></div></div>
            <form onSubmit={handleResetPassword} className="stacked-form login-form" aria-busy={isResettingPassword}>
              <label className="login-field">Password baru<input required minLength="8" type="password" autoComplete="new-password" value={resetPasswordForm.password} onChange={(event) => setResetPasswordForm({ ...resetPasswordForm, password: event.target.value })} /></label>
              <label className="login-field">Konfirmasi password<input required minLength="8" type="password" autoComplete="new-password" value={resetPasswordForm.confirmation} onChange={(event) => setResetPasswordForm({ ...resetPasswordForm, confirmation: event.target.value })} /></label>
              <button type="submit" className="primary-btn login-submit" disabled={isResettingPassword}>{isResettingPassword ? 'Menyimpan...' : 'Simpan password baru'}</button>
            </form>
          </section>
          )}

          {isStudentPortal && !resetToken && (
          <section className="panel login-panel student-login-panel">
            <div className="login-brand">
              <div className="login-mark" aria-hidden="true">Murid</div>
              <div>
                <p className="login-eyebrow">Portal Murid</p>
                <h2>Lanjutkan belajarmu</h2>
              </div>
            </div>
            <p className="login-description">Masuk dengan akun yang dibuat saat pendaftaran untuk melihat progress belajarmu.</p>
            <form onSubmit={handleStudentLogin} className="stacked-form login-form" aria-busy={isStudentLoggingIn}>
              <label className="login-field" htmlFor="student-username">
                Username
                <input
                  id="student-username"
                  required
                  autoComplete="username"
                  value={studentLoginForm.username}
                  onChange={(event) => setStudentLoginForm({ ...studentLoginForm, username: event.target.value })}
                />
              </label>
              <label className="login-field" htmlFor="student-password">
                Password
                <input
                  id="student-password"
                  required
                  type="password"
                  autoComplete="current-password"
                  value={studentLoginForm.password}
                  onChange={(event) => setStudentLoginForm({ ...studentLoginForm, password: event.target.value })}
                />
              </label>
              <button type="submit" className="primary-btn login-submit" disabled={isStudentLoggingIn}>
                {isStudentLoggingIn ? 'Memproses...' : 'Masuk sebagai murid'}
              </button>
            </form>
            {showForgotPassword ? (
              <form onSubmit={handleForgotPassword} className="stacked-form forgot-password-form">
                <label className="login-field">Email akun murid<input required type="email" autoComplete="email" value={forgotPasswordForm.email} onChange={(event) => setForgotPasswordForm({ email: event.target.value })} /></label>
                <button type="submit" className="secondary-btn" disabled={isSendingReset}>{isSendingReset ? 'Mengirim...' : 'Kirim tautan reset'}</button>
              </form>
            ) : (
              <button type="button" className="text-btn" onClick={() => setShowForgotPassword(true)}>Lupa password?</button>
            )}
            <p className="login-security-note">Belum punya akun? Lengkapi formulir pendaftaran melalui halaman Pendaftaran.</p>
          </section>
          )}
            </>
        )}

        {isPublicPortal && (
          <section className="panel">
            <h2>Daftar Murid Baru</h2>
          <form onSubmit={handleRegister} className="stacked-form">
            <div className="two-cols">
              <label>
                Nama lengkap
                <input
                  required
                  autoComplete="name"
                  value={registrationForm.fullName}
                  onChange={(event) => setRegistrationForm({ ...registrationForm, fullName: event.target.value })}
                />
              </label>
              <label>
                Email
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={registrationForm.email}
                  onChange={(event) => setRegistrationForm({ ...registrationForm, email: event.target.value })}
                />
              </label>
            </div>
            <div className="two-cols">
              <label>
                Username
                <input
                  required
                  minLength="3"
                  autoComplete="username"
                  value={registrationForm.username}
                  onChange={(event) => setRegistrationForm({ ...registrationForm, username: event.target.value })}
                />
              </label>
              <label>
                Password
                <input
                  required
                  minLength="8"
                  type="password"
                  autoComplete="new-password"
                  value={registrationForm.password}
                  onChange={(event) => setRegistrationForm({ ...registrationForm, password: event.target.value })}
                />
              </label>
            </div>
            <label>
              No. HP
              <input
                autoComplete="tel"
                value={registrationForm.phone}
                onChange={(event) => setRegistrationForm({ ...registrationForm, phone: event.target.value })}
              />
            </label>
            <label>
              Level
              <select
                value={registrationForm.interestLevel}
                onChange={(event) => setRegistrationForm({ ...registrationForm, interestLevel: event.target.value })}
              >
                <option value="Pemula">Pemula</option>
                <option value="Menengah">Menengah</option>
                <option value="Lanjutan">Lanjutan</option>
              </select>
            </label>
            <label>
              Catatan
              <textarea
                rows="3"
                value={registrationForm.notes}
                onChange={(event) => setRegistrationForm({ ...registrationForm, notes: event.target.value })}
              />
            </label>
            <button type="submit" className="primary-btn">Daftar sekarang</button>
            </form>
          </section>
          )}
        </main>
      )}

      {student && isStudentPortal && (
        <main className="content-grid student-portal">
          <section className="panel">
            <p className="eyebrow">Portal Murid</p>
            <h2>Halo, {student.fullName}</h2>
            <div className="student-profile-grid">
              <div><span>Username</span><strong>{student.username}</strong></div>
              <div><span>Email</span><strong>{student.email}</strong></div>
              <div><span>Level</span><strong>{student.interestLevel || 'Pemula'}</strong></div>
              <div><span>Status</span><strong>{student.status || 'baru'}</strong></div>
            </div>
          </section>
          <section className="panel">
            <h2>Progress Belajar</h2>
            {(student.progress || []).length === 0 ? (
              <p className="empty-state">Progress belajar belum tersedia. Admin akan menambahkan catatan setelah pembelajaran.</p>
            ) : (
              <div className="student-progress-list">
                {student.progress.map((progress) => {
                  const category = getScoreCategory(progress.score)
                  return (
                    <article key={progress.id} className="student-progress-item">
                      <div>
                        <strong>{progress.subject}</strong>
                        <p>{progress.notes || 'Belum ada catatan tambahan.'}</p>
                        <p className="student-progress-guidance">{getStudentProgressMessage(category)}</p>
                        <p className="student-progress-detail">{category.guidance}</p>
                        <p className="student-progress-date">Dinilai pada {formatAssessmentDate(progress.createdAt)}</p>
                      </div>
                      <span className={`table-badge score-badge ${category.tone}`}>{category.letter} ({progress.score})</span>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
          <section className="panel widetwo">
            <h2>Kursus Saya</h2>
            {(student.courses || []).length === 0 ? (
              <p className="empty-state">Belum ada kursus yang terdaftar.</p>
            ) : (
              <div className="student-progress-list">
                {student.courses.map((enrollment) => (
                  <article key={enrollment.id} className="student-progress-item">
                    <div>
                      <strong>{enrollment.courseName}</strong>
                      <p>Status: {enrollment.status}</p>
                      {(enrollment.weeklyGrades || []).length === 0 ? (
                        <p className="student-progress-detail">Nilai mingguan belum tersedia.</p>
                      ) : (
                        enrollment.weeklyGrades.map((grade) => (
                          <p key={grade.id} className="student-progress-detail">
                            Minggu {grade.weekNumber}: <strong>{grade.grade || getScoreCategory(grade.score).letter} ({grade.score})</strong>{grade.notes ? ` — ${grade.notes}` : ''}
                          </p>
                        ))
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
          <section className="panel widetwo">
            <h2>Pengumuman</h2>
            <div className="list-box">
              {announcements.length === 0 ? (
                <p className="empty-state">Belum ada pengumuman.</p>
              ) : (
                announcements.map((item) => (
                  <article key={item.id} className="announcement-item">
                    <h3>{item.title}</h3>
                    <p>{item.content}</p>
                    <small>{item.createdAt}</small>
                  </article>
                ))
              )}
            </div>
          </section>
        </main>
      )}

      {!admin && !student && isPublicPortal && (
        <section className="panel widetwo">
          <h2>Pengumuman</h2>
          <div className="list-box">
            {announcements.length === 0 ? (
              <p className="empty-state">Belum ada pengumuman.</p>
            ) : (
              announcements.map((item) => (
                <div key={item.id} className="list-item">
                  <div className="list-header">
                    <strong>{item.title}</strong>
                    <span>{item.createdAt}</span>
                  </div>
                  <p>{item.content}</p>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {admin && isAdminPortal && (
        <div className="admin-layout">
          <aside className="admin-sidebar">
            <div className="admin-sidebar-heading">
              <p>Dashboard Admin</p>
              <strong>{BRAND_NAME}</strong>
            </div>
            <nav className="admin-nav" aria-label="Navigasi admin">
              {adminModules.map((module) => (
                <button
                  key={module.id}
                  type="button"
                  className={`admin-nav-button ${activeAdminView === module.id ? 'is-active' : ''}`}
                  aria-current={activeAdminView === module.id ? 'page' : undefined}
                  onClick={() => setActiveAdminView(module.id)}
                >
                  {module.label}
                </button>
              ))}
            </nav>
          </aside>

          <main className="admin-content">
            {activeAdminView === 'ringkasan' && (
              <section className="admin-module">
                <div className="admin-module-heading">
                  <p>Ringkasan</p>
                  <h2>Selamat datang, {admin.username}</h2>
                  <span>Pantau aktivitas akademi dari satu tempat.</span>
                </div>
                <section className="stats-grid admin-stats-grid">
                  <article className="stat-card">
                    <span>Total murid</span>
                    <strong>{metrics.totalStudents}</strong>
                  </article>
                  <article className="stat-card">
                    <span>Pengumuman</span>
                    <strong>{metrics.totalAnnouncements}</strong>
                  </article>
                  <article className="stat-card">
                    <span>Nilai rata-rata</span>
                    <strong>{metrics.averageScore}</strong>
                  </article>
                </section>
              </section>
            )}

            {activeAdminView === 'murid' && (
              <section className="panel admin-module">
                <div className="admin-module-heading">
                  <p>Manajemen murid</p>
                  <h2>Data Murid</h2>
                  <span>Periksa pendaftaran umum, enrollment kursus, dan nilai belajar murid dalam satu tampilan.</span>
                </div>

                <div className="student-toolbar">
                  <label className="student-search" htmlFor="student-search">
                    Cari murid
                    <input
                      id="student-search"
                      type="search"
                      placeholder="Nama, email, HP, sekolah, atau level"
                      value={studentSearch}
                      onChange={(event) => setStudentSearch(event.target.value)}
                    />
                  </label>
                  <p className="student-result-count">{filteredStudents.length} dari {students.length} murid</p>
                </div>

                <section className="student-table-section" aria-labelledby="student-directory-title">
                  <h3 id="student-directory-title">Direktori Murid</h3>
                  <div className="table-wrapper" tabIndex="0">
                    <table className="admin-table">
                      <caption className="visually-hidden">Data murid terdaftar</caption>
                      <thead>
                        <tr>
                          <th scope="col">Murid</th>
                          <th scope="col">Kontak</th>
                          <th scope="col">Sekolah / Instansi</th>
                          <th scope="col">Level</th>
                          <th scope="col">Status</th>
                          <th scope="col">Terdaftar</th>
                          <th scope="col" className="number-cell">Progress</th>
                          <th scope="col" className="number-cell">Rata-rata</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.length === 0 ? (
                          <tr>
                            <td colSpan="8" className="table-empty-state">Belum ada murid yang terdaftar.</td>
                          </tr>
                        ) : filteredStudents.length === 0 ? (
                          <tr>
                            <td colSpan="8" className="table-empty-state">Tidak ada murid yang sesuai dengan pencarian.</td>
                          </tr>
                        ) : (
                          filteredStudents.map((student) => {
                            const progress = student.progress || []
                            const averageScore = progress.length
                              ? Math.round(progress.reduce((total, item) => total + Number(item.score || 0), 0) / progress.length)
                              : null

                            return (
                              <tr key={student.id}>
                                <th scope="row">
                                  <span className="table-primary-text">{student.fullName}</span>
                                  <span className="table-secondary-text">{student.email}</span>
                                </th>
                                <td>{student.phone || '—'}</td>
                                <td>{student.school || '—'}</td>
                                <td>{student.interestLevel || '—'}</td>
                                <td><span className="table-badge table-status-badge">{student.status || '—'}</span></td>
                                <td>{student.createdAt || '—'}</td>
                                <td className="number-cell">{progress.length}</td>
                                <td className="number-cell">{averageScore ?? '—'}</td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="student-table-section" aria-labelledby="student-progress-title">
                  <div className="student-table-heading">
                    <div>
                      <h3 id="student-progress-title">Nilai & Progress Belajar</h3>
                      <p>Riwayat nilai berdasarkan murid dan mata pelajaran.</p>
                    </div>
                    <span className="progress-record-count">{progressRows.length} catatan nilai</span>
                  </div>
                  <div className="table-wrapper" tabIndex="0">
                    <table className="admin-table">
                      <caption className="visually-hidden">Nilai dan progress belajar murid</caption>
                      <thead>
                        <tr>
                          <th scope="col">Murid</th>
                          <th scope="col">Mata Pelajaran</th>
                          <th scope="col" className="number-cell">Nilai</th>
                          <th scope="col">Tindak lanjut</th>
                          <th scope="col">Catatan</th>
                          <th scope="col">Dicatat pada</th>
                        </tr>
                      </thead>
                      <tbody>
                        {progressRows.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="table-empty-state">
                              {students.length === 0
                                ? 'Belum ada data nilai karena belum ada murid terdaftar.'
                                : filteredStudents.length === 0
                                  ? 'Tidak ada nilai yang sesuai dengan pencarian.'
                                  : 'Belum ada nilai. Tambahkan dari modul Progress Belajar.'}
                            </td>
                          </tr>
                        ) : (
                          progressRows.map((progress) => {
                            const category = getScoreCategory(progress.score)
                            return (
                              <tr key={`${progress.studentName}-${progress.id}`}>
                                <th scope="row">{progress.studentName}</th>
                                <td>{progress.subject}</td>
                                <td className="number-cell"><strong>{category.letter ? `${category.letter} (${progress.score})` : progress.score}</strong></td>
                                <td><span className={`table-badge score-badge ${category.tone}`}>{category.action}</span></td>
                                <td>{progress.notes || '—'}</td>
                                <td>{progress.createdAt || '—'}</td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </section>
            )}

            {activeAdminView === 'progress' && (
              <section className="panel admin-module">
                <div className="admin-module-heading">
                  <p>Evaluasi belajar</p>
                  <h2>Tambah Progress Murid</h2>
                  <span>Simpan nilai dan catatan pembelajaran murid.</span>
                </div>
                <form onSubmit={handleProgressSubmit} className="stacked-form">
                  <label>
                    Pilih murid
                    <select
                      required
                      value={progressForm.studentId}
                      onChange={(event) => setProgressForm({ ...progressForm, studentId: event.target.value })}
                    >
                      <option value="">Pilih murid</option>
                      {students.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.fullName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="two-cols">
                    <label>
                      Mata pelajaran
                      <input
                        required
                        value={progressForm.subject}
                        onChange={(event) => setProgressForm({ ...progressForm, subject: event.target.value })}
                      />
                    </label>
                    <label>
                      Nilai
                      <select
                        required
                        value={progressForm.score}
                        onChange={(event) => setProgressForm({ ...progressForm, score: event.target.value })}
                      >
                        <option value="">Pilih nilai</option>
                        {gradeOptions.map((grade) => (
                          <option key={grade.letter} value={grade.score}>
                            {grade.letter} — {grade.score}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {selectedGrade && (
                    <p className={`grade-guidance ${selectedGrade.tone}`} role="status" aria-live="polite">
                      <strong>Nilai {selectedGrade.letter} ({selectedGrade.score}):</strong> {selectedGrade.guidance}
                    </p>
                  )}
                  <label>
                    Catatan
                    <textarea
                      rows="3"
                      value={progressForm.notes}
                      onChange={(event) => setProgressForm({ ...progressForm, notes: event.target.value })}
                    />
                  </label>
                  <button type="submit" className="primary-btn">Simpan nilai</button>
                </form>
              </section>
            )}

            {activeAdminView === 'kursus' && (
              <section className="panel admin-module">
                <div className="admin-module-heading">
                  <p>Manajemen akademik</p>
                  <h2>Kursus & Pendaftaran</h2>
                  <span>Kelola katalog kursus, pendaftaran siswa, dan nilai mingguan.</span>
                </div>
                <div className="content-grid">
                  <form onSubmit={handleCourseSubmit} className="stacked-form">
                    <h3>Buat kursus</h3>
                    <label>Nama kursus<input required maxLength="150" value={courseForm.name} onChange={(event) => setCourseForm({ ...courseForm, name: event.target.value })} /></label>
                    <label>Deskripsi<textarea rows="3" value={courseForm.description} onChange={(event) => setCourseForm({ ...courseForm, description: event.target.value })} /></label>
                    <button type="submit" className="primary-btn">Simpan kursus</button>
                  </form>
                  <form onSubmit={handleEnrollmentSubmit} className="stacked-form">
                    <h3>Daftarkan siswa</h3>
                    <label>Siswa<select required value={enrollmentForm.studentId} onChange={(event) => setEnrollmentForm({ ...enrollmentForm, studentId: event.target.value })}><option value="">Pilih siswa</option>{students.map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>)}</select></label>
                    <label>Kursus<select required value={enrollmentForm.courseId} onChange={(event) => setEnrollmentForm({ ...enrollmentForm, courseId: event.target.value })}><option value="">Pilih kursus</option>{courses.filter((item) => item.status === 'aktif').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                    <button type="submit" className="primary-btn">Daftarkan</button>
                  </form>
                </div>
                <form onSubmit={handleWeeklyGradeSubmit} className="stacked-form full-width">
                  <h3>Nilai mingguan</h3>
                  <div className="two-cols">
                    <label>Pendaftaran<select required value={weeklyGradeForm.enrollmentId} onChange={(event) => setWeeklyGradeForm({ ...weeklyGradeForm, enrollmentId: event.target.value })}><option value="">Pilih pendaftaran</option>{enrollments.map((item) => <option key={item.id} value={item.id}>{item.studentName} — {item.courseName}</option>)}</select></label>
                    <label>Minggu<input required type="number" min="1" max="52" value={weeklyGradeForm.weekNumber} onChange={(event) => setWeeklyGradeForm({ ...weeklyGradeForm, weekNumber: event.target.value })} /></label>
                  </div>
                  <div className="two-cols">
                    <label>Nilai<select required value={weeklyGradeForm.grade} onChange={(event) => setWeeklyGradeForm({ ...weeklyGradeForm, grade: event.target.value })}><option value="">Pilih nilai</option>{gradeOptions.map((item) => <option key={item.letter} value={item.letter}>{item.letter} ({item.score})</option>)}</select></label>
                    <label>Catatan<input value={weeklyGradeForm.notes} onChange={(event) => setWeeklyGradeForm({ ...weeklyGradeForm, notes: event.target.value })} /></label>
                  </div>
                  <button type="submit" className="primary-btn">Simpan nilai mingguan</button>
                </form>
                <div className="list-box">
                  {courses.map((course) => <div key={course.id} className="list-item"><strong>{course.name}</strong><p>{course.description || 'Tanpa deskripsi'} · {course.status}</p></div>)}
                  {enrollments.map((item) => <div key={`enrollment-${item.id}`} className="list-item"><strong>{item.studentName} — {item.courseName}</strong><p>{item.weeklyGrades.length} nilai mingguan · {item.status}</p></div>)}
                </div>
              </section>
            )}

            {activeAdminView === 'pengumuman' && (
              <section className="panel admin-module">
                <div className="admin-module-heading">
                  <p>Komunikasi kelas</p>
                  <h2>Pengumuman</h2>
                  <span>Buat dan tinjau informasi terbaru untuk murid.</span>
                </div>
                <form onSubmit={handlePublishAnnouncement} className="stacked-form">
                  <label>
                    Judul pengumuman
                    <input
                      required
                      value={announcementForm.title}
                      onChange={(event) => setAnnouncementForm({ ...announcementForm, title: event.target.value })}
                    />
                  </label>
                  <label>
                    Isi pengumuman
                    <textarea
                      required
                      rows="4"
                      value={announcementForm.content}
                      onChange={(event) => setAnnouncementForm({ ...announcementForm, content: event.target.value })}
                    />
                  </label>
                  <button type="submit" className="primary-btn">Publikasikan</button>
                </form>
                <div className="list-box">
                  {announcements.length === 0 ? (
                    <p className="empty-state">Belum ada pengumuman.</p>
                  ) : (
                    announcements.map((item) => (
                      <div key={item.id} className="list-item">
                        <div className="list-header">
                          <strong>{item.title}</strong>
                          <span>{item.createdAt}</span>
                        </div>
                        <p>{item.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}
          </main>
        </div>
      )}
    </div>
  )
}

export default App
