import { formatAssessmentDate, getScoreCategory, getStudentProgressMessage } from '../../lib/grades'
import { AnnouncementList } from '../common/AnnouncementList'

export function StudentDashboard({ student, announcements }) {
  const progress = student.progress || []
  const courses = student.courses || []

  return (
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
        {progress.length === 0 ? (
          <p className="empty-state">
            Progress belajar belum tersedia. Admin akan menambahkan catatan setelah pembelajaran.
          </p>
        ) : (
          <div className="student-progress-list">
            {progress.map((item) => {
              const category = getScoreCategory(item.score)
              return (
                <article key={item.id} className="student-progress-item">
                  <div>
                    <strong>{item.subject}</strong>
                    <p>{item.notes || 'Belum ada catatan tambahan.'}</p>
                    <p className="student-progress-guidance">{getStudentProgressMessage(category)}</p>
                    <p className="student-progress-detail">{category.guidance}</p>
                    <p className="student-progress-date">
                      Dinilai pada {formatAssessmentDate(item.createdAt)}
                    </p>
                  </div>
                  <span className={`table-badge score-badge ${category.tone}`}>
                    {category.letter} ({item.score})
                  </span>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className="panel widetwo">
        <h2>Kursus Saya</h2>
        {courses.length === 0 ? (
          <p className="empty-state">Belum ada kursus yang terdaftar.</p>
        ) : (
          <div className="student-progress-list">
            {courses.map((enrollment) => (
              <article key={enrollment.id} className="student-progress-item">
                <div>
                  <strong>{enrollment.courseName}</strong>
                  <p>Status: {enrollment.status}</p>
                  {(enrollment.weeklyGrades || []).length === 0 ? (
                    <p className="student-progress-detail">Nilai mingguan belum tersedia.</p>
                  ) : (
                    enrollment.weeklyGrades.map((grade) => (
                      <p key={grade.id} className="student-progress-detail">
                        Minggu {grade.weekNumber}:{' '}
                        <strong>
                          {grade.grade || getScoreCategory(grade.score).letter} ({grade.score})
                        </strong>
                        {grade.notes ? ` — ${grade.notes}` : ''}
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
          <AnnouncementList announcements={announcements} variant="article" />
        </div>
      </section>
    </main>
  )
}
