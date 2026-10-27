import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import './App.css'
import { AppDataProvider } from './hooks/AppDataContext'
import { useAppData } from './hooks/useAppData'
import { useAuthActions } from './hooks/useAuthActions'
import { AlertBanner } from './components/common/AlertBanner'
import { TopBar } from './components/common/TopBar'
import { AdminPage } from './pages/AdminPage'
import { PublicPage } from './pages/PublicPage'
import { StudentPage } from './pages/StudentPage'

function AppShell() {
  const { admin, student, isAuthLoading, message } = useAppData()
  const { logoutAdmin, logoutStudent } = useAuthActions()
  const navigate = useNavigate()
  const location = useLocation()

  // Setelah sesi dipulihkan, antarkan pengguna ke portalnya sendiri.
  useEffect(() => {
    if (isAuthLoading || location.pathname !== '/') return
    if (admin) navigate('/admin', { replace: true })
    else if (student) navigate('/murid', { replace: true })
  }, [admin, student, isAuthLoading, location.pathname, navigate])

  return (
    <div className="page-shell">
      <TopBar
        admin={admin}
        student={student}
        isAuthLoading={isAuthLoading}
        onLogoutAdmin={logoutAdmin}
        onLogoutStudent={logoutStudent}
      />

      <AlertBanner message={message} />

      <Routes>
        <Route path="/" element={<PublicPage />} />
        <Route path="/murid" element={<StudentPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <AppDataProvider>
      <AppShell />
    </AppDataProvider>
  )
}
