import { useState } from 'react'

import { emptyResetPassword } from '../../lib/constants'

export function ResetPasswordPanel({ onSubmit, onMismatch }) {
  const [form, setForm] = useState(emptyResetPassword)
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (form.password !== form.confirmation) {
      onMismatch()
      return
    }

    setIsSaving(true)
    try {
      if (await onSubmit(form.password)) setForm(emptyResetPassword)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="panel login-panel student-login-panel">
      <div className="login-brand">
        <div className="login-mark" aria-hidden="true">Reset</div>
        <div>
          <p className="login-eyebrow">Pemulihan akun</p>
          <h2>Buat password baru</h2>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="stacked-form login-form" aria-busy={isSaving}>
        <label className="login-field">
          Password baru
          <input
            required
            minLength="8"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
        </label>
        <label className="login-field">
          Konfirmasi password
          <input
            required
            minLength="8"
            type="password"
            autoComplete="new-password"
            value={form.confirmation}
            onChange={(event) => setForm({ ...form, confirmation: event.target.value })}
          />
        </label>
        <button type="submit" className="primary-btn login-submit" disabled={isSaving}>
          {isSaving ? 'Menyimpan...' : 'Simpan password baru'}
        </button>
      </form>
    </section>
  )
}
