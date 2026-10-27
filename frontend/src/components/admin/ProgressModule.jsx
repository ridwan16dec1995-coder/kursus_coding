import { useState } from 'react'

import { emptyProgress, gradeOptions } from '../../lib/constants'

export function ProgressModule({ students, onSubmit }) {
  const [form, setForm] = useState(emptyProgress)

  const selectedGrade = gradeOptions.find((grade) => String(grade.score) === form.score)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (await onSubmit(form)) setForm(emptyProgress)
  }

  return (
    <section className="panel admin-module">
      <div className="admin-module-heading">
        <p>Evaluasi belajar</p>
        <h2>Tambah Progress Murid</h2>
        <span>Simpan nilai dan catatan pembelajaran murid.</span>
      </div>
      <form onSubmit={handleSubmit} className="stacked-form">
        <label>
          Pilih murid
          <select
            required
            value={form.studentId}
            onChange={(event) => setForm({ ...form, studentId: event.target.value })}
          >
            <option value="">Pilih murid</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>{student.fullName}</option>
            ))}
          </select>
        </label>
        <div className="two-cols">
          <label>
            Mata pelajaran
            <input
              required
              value={form.subject}
              onChange={(event) => setForm({ ...form, subject: event.target.value })}
            />
          </label>
          <label>
            Nilai
            <select
              required
              value={form.score}
              onChange={(event) => setForm({ ...form, score: event.target.value })}
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
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
          />
        </label>
        <button type="submit" className="primary-btn">Simpan nilai</button>
      </form>
    </section>
  )
}
