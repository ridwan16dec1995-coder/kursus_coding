import { useMemo, useState } from 'react'

import { BRAND_NAME, adminModules } from '../lib/constants'
import { useAppData } from '../hooks/useAppData'
import { useAdminActions } from '../hooks/useAdminActions'
import { useAuthActions } from '../hooks/useAuthActions'
import { AdminLoginPanel } from '../components/admin/AdminLoginPanel'
import { AnnouncementsModule } from '../components/admin/AnnouncementsModule'
import { CoursesModule } from '../components/admin/CoursesModule'
import { ProgressModule } from '../components/admin/ProgressModule'
import { StudentsModule } from '../components/admin/StudentsModule'
import { SummaryModule } from '../components/admin/SummaryModule'

export function AdminPage() {
  const { admin, students, announcements, courses, enrollments, isAuthLoading } = useAppData()
  const { isLoggingIn, loginAdmin } = useAuthActions()
  const actions = useAdminActions()
  const [activeView, setActiveView] = useState('ringkasan')

  const metrics = useMemo(() => {
    const totalScores = students.reduce((acc, item) => {
      const values = item.progress || []
      if (!values.length) return acc
      return acc + values.reduce((sum, progressItem) => sum + Number(progressItem.score || 0), 0)
    }, 0)

    const totalProgressEntries = students.reduce(
      (count, item) => count + (item.progress || []).length,
      0,
    )

    return {
      totalStudents: students.length,
      totalAnnouncements: announcements.length,
      averageScore: totalProgressEntries ? Math.round(totalScores / totalProgressEntries) : 0,
    }
  }, [students, announcements])

  if (!admin) {
    if (isAuthLoading) {
      return (
        <main className="content-grid">
          <p className="empty-state">Memeriksa sesi...</p>
        </main>
      )
    }

    return (
      <main className="content-grid">
        <AdminLoginPanel onLogin={loginAdmin} isLoggingIn={isLoggingIn} />
      </main>
    )
  }

  return (
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
              className={`admin-nav-button ${activeView === module.id ? 'is-active' : ''}`}
              aria-current={activeView === module.id ? 'page' : undefined}
              onClick={() => setActiveView(module.id)}
            >
              {module.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="admin-content">
        {activeView === 'ringkasan' && (
          <SummaryModule adminName={admin.username} metrics={metrics} />
        )}

        {activeView === 'murid' && <StudentsModule students={students} />}

        {activeView === 'progress' && (
          <ProgressModule students={students} onSubmit={actions.saveProgress} />
        )}

        {activeView === 'kursus' && (
          <CoursesModule
            students={students}
            courses={courses}
            enrollments={enrollments}
            onCreateCourse={actions.createCourse}
            onCreateEnrollment={actions.createEnrollment}
            onCreateWeeklyGrade={actions.createWeeklyGrade}
          />
        )}

        {activeView === 'pengumuman' && (
          <AnnouncementsModule
            announcements={announcements}
            onSubmit={actions.publishAnnouncement}
          />
        )}
      </main>
    </div>
  )
}
