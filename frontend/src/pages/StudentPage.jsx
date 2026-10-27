import { useSearchParams } from 'react-router-dom'

import { useAppData } from '../hooks/useAppData'
import { useAuthActions } from '../hooks/useAuthActions'
import { ResetPasswordPanel } from '../components/student/ResetPasswordPanel'
import { StudentDashboard } from '../components/student/StudentDashboard'
import { StudentLoginPanel } from '../components/student/StudentLoginPanel'

export function StudentPage() {
  const { student, announcements, isAuthLoading, showError } = useAppData()
  const { isStudentLoggingIn, loginStudent, requestPasswordReset, resetPassword } = useAuthActions()
  const [searchParams, setSearchParams] = useSearchParams()
  const resetToken = searchParams.get('resetToken') || ''

  const handleResetPassword = async (password) => {
    const succeeded = await resetPassword(resetToken, password)
    // Buang token dari URL agar tautan reset tidak dapat dipakai ulang dari riwayat browser.
    if (succeeded) setSearchParams({}, { replace: true })
    return succeeded
  }

  // Tautan reset selalu membuka formulir password baru, termasuk saat murid sedang login.
  if (resetToken) {
    return (
      <main className="content-grid">
        <ResetPasswordPanel
          onSubmit={handleResetPassword}
          onMismatch={() => showError('Konfirmasi password tidak cocok.')}
        />
      </main>
    )
  }

  if (student) {
    return <StudentDashboard student={student} announcements={announcements} />
  }

  if (isAuthLoading) {
    return (
      <main className="content-grid">
        <p className="empty-state">Memeriksa sesi...</p>
      </main>
    )
  }

  return (
    <main className="content-grid">
      <StudentLoginPanel
        onLogin={loginStudent}
        onForgotPassword={requestPasswordReset}
        isLoggingIn={isStudentLoggingIn}
      />
    </main>
  )
}
