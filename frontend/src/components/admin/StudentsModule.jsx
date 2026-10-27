import { useMemo, useState } from 'react'

import { averageScoreOf, getScoreCategory } from '../../lib/grades'

export function StudentsModule({ students }) {
  const [search, setSearch] = useState('')

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return students

    return students.filter((student) => [
      student.fullName,
      student.email,
      student.phone,
      student.school,
      student.interestLevel,
    ].some((value) => String(value || '').toLowerCase().includes(term)))
  }, [students, search])

  const progressRows = useMemo(() => (
    filteredStudents
      .flatMap((student) => (student.progress || []).map((progress) => ({
        ...progress,
        studentName: student.fullName,
      })))
      .sort((first, second) => (second.createdAt || '').localeCompare(first.createdAt || ''))
  ), [filteredStudents])

  const emptyProgressMessage = students.length === 0
    ? 'Belum ada data nilai karena belum ada murid terdaftar.'
    : filteredStudents.length === 0
      ? 'Tidak ada nilai yang sesuai dengan pencarian.'
      : 'Belum ada nilai. Tambahkan dari modul Progress Belajar.'

  return (
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
            value={search}
            onChange={(event) => setSearch(event.target.value)}
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
                      <td className="number-cell">{averageScoreOf(progress) ?? '—'}</td>
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
            <h3 id="student-progress-title">Nilai &amp; Progress Belajar</h3>
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
                  <td colSpan="6" className="table-empty-state">{emptyProgressMessage}</td>
                </tr>
              ) : (
                progressRows.map((progress) => {
                  const category = getScoreCategory(progress.score)
                  return (
                    <tr key={`${progress.studentName}-${progress.id}`}>
                      <th scope="row">{progress.studentName}</th>
                      <td>{progress.subject}</td>
                      <td className="number-cell">
                        <strong>
                          {category.letter ? `${category.letter} (${progress.score})` : progress.score}
                        </strong>
                      </td>
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
  )
}
