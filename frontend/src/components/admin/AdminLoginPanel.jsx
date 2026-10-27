import { useState } from 'react'

import { BRAND_NAME, emptyLogin } from '../../lib/constants'

export function AdminLoginPanel({ onLogin, isLoggingIn }) {
  const [form, setForm] = useState(emptyLogin)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (await onLogin(form)) setForm(emptyLogin)
  }

  return (
    <section className="panel login-panel">
      <div className="login-brand">
        <div className="login-mark" aria-hidden="true">&lt;R/one&gt;</div>
        <div>
          <p className="login-eyebrow">Admin Portal</p>
          <h2>Selamat datang kembali</h2>
        </div>
      </div>
      <p className="login-description">
        Masuk untuk mengelola murid, pengumuman, dan progress belajar.
      </p>
      <form onSubmit={handleSubmit} className="stacked-form login-form" aria-busy={isLoggingIn}>
        <label className="login-field" htmlFor="admin-username">
          Username
          <input
            id="admin-username"
            required
            autoComplete="username"
            value={form.username}
            onChange={(event) => setForm({ ...form, username: event.target.value })}
          />
        </label>
        <label className="login-field" htmlFor="admin-password">
          Password
          <input
            id="admin-password"
            required
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
        </label>
        <button type="submit" className="primary-btn login-submit" disabled={isLoggingIn}>
          {isLoggingIn ? 'Memproses...' : 'Masuk ke dashboard'}
        </button>
      </form>
      <p className="login-security-note">Akses khusus untuk administrator {BRAND_NAME}.</p>
    </section>
  )
}
