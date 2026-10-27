import { useState } from 'react'

import { emptyCourse, emptyEnrollment, emptyWeeklyGrade, gradeOptions } from '../../lib/constants'

export function CoursesModule({
  students,
  courses,
  enrollments,
  onCreateCourse,
  onCreateEnrollment,
  onCreateWeeklyGrade,
}) {
  const [courseForm, setCourseForm] = useState(emptyCourse)
  const [enrollmentForm, setEnrollmentForm] = useState(emptyEnrollment)
  const [weeklyGradeForm, setWeeklyGradeForm] = useState(emptyWeeklyGrade)

  const submitCourse = async (event) => {
    event.preventDefault()
    if (await onCreateCourse(courseForm)) setCourseForm(emptyCourse)
  }

  const submitEnrollment = async (event) => {
    event.preventDefault()
    if (await onCreateEnrollment(enrollmentForm)) setEnrollmentForm(emptyEnrollment)
  }

  const submitWeeklyGrade = async (event) => {
    event.preventDefault()
    if (await onCreateWeeklyGrade(weeklyGradeForm)) setWeeklyGradeForm(emptyWeeklyGrade)
  }

  return (
    <section className="panel admin-module">
      <div className="admin-module-heading">
        <p>Manajemen akademik</p>
        <h2>Kursus &amp; Pendaftaran</h2>
        <span>Kelola katalog kursus, pendaftaran siswa, dan nilai mingguan.</span>
      </div>

      <div className="content-grid">
        <form onSubmit={submitCourse} className="stacked-form">
          <h3>Buat kursus</h3>
          <label>
            Nama kursus
            <input
              required
              maxLength="150"
              value={courseForm.name}
              onChange={(event) => setCourseForm({ ...courseForm, name: event.target.value })}
            />
          </label>
          <label>
            Deskripsi
            <textarea
              rows="3"
              value={courseForm.description}
              onChange={(event) => setCourseForm({ ...courseForm, description: event.target.value })}
            />
          </label>
          <button type="submit" className="primary-btn">Simpan kursus</button>
        </form>

        <form onSubmit={submitEnrollment} className="stacked-form">
          <h3>Daftarkan siswa</h3>
          <label>
            Siswa
            <select
              required
              value={enrollmentForm.studentId}
              onChange={(event) => setEnrollmentForm({ ...enrollmentForm, studentId: event.target.value })}
            >
              <option value="">Pilih siswa</option>
              {students.map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>)}
            </select>
          </label>
          <label>
            Kursus
            <select
              required
              value={enrollmentForm.courseId}
              onChange={(event) => setEnrollmentForm({ ...enrollmentForm, courseId: event.target.value })}
            >
              <option value="">Pilih kursus</option>
              {courses
                .filter((item) => item.status === 'aktif')
                .map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <button type="submit" className="primary-btn">Daftarkan</button>
        </form>
      </div>

      <form onSubmit={submitWeeklyGrade} className="stacked-form full-width">
        <h3>Nilai mingguan</h3>
        <div className="two-cols">
          <label>
            Pendaftaran
            <select
              required
              value={weeklyGradeForm.enrollmentId}
              onChange={(event) => setWeeklyGradeForm({ ...weeklyGradeForm, enrollmentId: event.target.value })}
            >
              <option value="">Pilih pendaftaran</option>
              {enrollments.map((item) => (
                <option key={item.id} value={item.id}>{item.studentName} — {item.courseName}</option>
              ))}
            </select>
          </label>
          <label>
            Minggu
            <input
              required
              type="number"
              min="1"
              max="52"
              value={weeklyGradeForm.weekNumber}
              onChange={(event) => setWeeklyGradeForm({ ...weeklyGradeForm, weekNumber: event.target.value })}
            />
          </label>
        </div>
        <div className="two-cols">
          <label>
            Nilai
            <select
              required
              value={weeklyGradeForm.grade}
              onChange={(event) => setWeeklyGradeForm({ ...weeklyGradeForm, grade: event.target.value })}
            >
              <option value="">Pilih nilai</option>
              {gradeOptions.map((item) => (
                <option key={item.letter} value={item.letter}>{item.letter} ({item.score})</option>
              ))}
            </select>
          </label>
          <label>
            Catatan
            <input
              value={weeklyGradeForm.notes}
              onChange={(event) => setWeeklyGradeForm({ ...weeklyGradeForm, notes: event.target.value })}
            />
          </label>
        </div>
        <button type="submit" className="primary-btn">Simpan nilai mingguan</button>
      </form>

      <div className="list-box">
        {courses.map((course) => (
          <div key={course.id} className="list-item">
            <strong>{course.name}</strong>
            <p>{course.description || 'Tanpa deskripsi'} · {course.status}</p>
          </div>
        ))}
        {enrollments.map((item) => (
          <div key={`enrollment-${item.id}`} className="list-item">
            <strong>{item.studentName} — {item.courseName}</strong>
            <p>{item.weeklyGrades.length} nilai mingguan · {item.status}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
