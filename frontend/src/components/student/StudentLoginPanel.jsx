import { useState } from 'react'

import { BRAND_NAME, emptyForgotPassword, emptyStudentLogin } from '../../lib/constants'

export function StudentLoginPanel({ onLogin, onForgotPassword, isLoggingIn }) {
  const [form, setForm] = useState(emptyStudentLogin)
  const [forgotForm, setForgotForm] = useState(emptyForgotPassword)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [isSendingReset, setIsSendingReset] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    await onLogin(form)
  }

  const handleForgotSubmit = async (event) => {
    event.preventDefault()
    setIsSendingReset(true)
    try {
      if (await onForgotPassword(forgotForm.email)) {
        setForgotForm(emptyForgotPassword)
        setShowForgotPassword(false)
      }
    } finally {
      setIsSendingReset(false)
    }
  }

  return (
    <section className="panel login-panel student-login-panel">
      <div className="login-brand">
        <div className="login-mark" aria-hidden="true">Murid</div>
        <div>
          <p className="login-eyebrow">Portal Murid</p>
          <h2>Lanjutkan belajarmu</h2>
        </div>
      </div>
      <p className="login-description">
        Masuk dengan akun yang dibuat saat pendaftaran untuk melihat progress belajarmu.
      </p>
      <form onSubmit={handleSubmit} className="stacked-form login-form" aria-busy={isLoggingIn}>
        <label className="login-field" htmlFor="student-username">
          Username
          <input
            id="student-username"
            required
            autoComplete="username"
            value={form.username}
            onChange={(event) => setForm({ ...form, username: event.target.value })}
          />
        </label>
        <label className="login-field" htmlFor="student-password">
          Password
          <input
            id="student-password"
            required
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
        </label>
        <button type="submit" className="primary-btn login-submit" disabled={isLoggingIn}>
          {isLoggingIn ? 'Memproses...' : 'Masuk sebagai murid'}
        </button>
      </form>

      {showForgotPassword ? (
        <form onSubmit={handleForgotSubmit} className="stacked-form forgot-password-form">
          <label className="login-field">
            Email akun murid
            <input
              required
              type="email"
              autoComplete="email"
              value={forgotForm.email}
              onChange={(event) => setForgotForm({ email: event.target.value })}
            />
          </label>
          <button type="submit" className="secondary-btn" disabled={isSendingReset}>
            {isSendingReset ? 'Mengirim...' : 'Kirim tautan reset'}
          </button>
        </form>
      ) : (
        <button type="button" className="text-btn" onClick={() => setShowForgotPassword(true)}>
          Lupa password?
        </button>
      )}

      <p className="login-security-note">
        Belum punya akun? Lengkapi formulir pendaftaran melalui halaman Pendaftaran.
      </p>
      <p className="visually-hidden">{BRAND_NAME}</p>
    </section>
  )
}
