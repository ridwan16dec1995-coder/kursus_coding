import { useState } from 'react'

import { emptyRegistration } from '../../lib/constants'

export function RegistrationForm({ onSubmit }) {
  const [form, setForm] = useState(emptyRegistration)

  const updateField = (field) => (event) => setForm({ ...form, [field]: event.target.value })

  const handleSubmit = async (event) => {
    event.preventDefault()
    const succeeded = await onSubmit(form)
    if (succeeded) setForm(emptyRegistration)
  }

  return (
    <section className="panel">
      <h2>Daftar Murid Baru</h2>
      <form onSubmit={handleSubmit} className="stacked-form">
        <div className="two-cols">
          <label>
            Nama lengkap
            <input required autoComplete="name" value={form.fullName} onChange={updateField('fullName')} />
          </label>
          <label>
            Email
            <input required type="email" autoComplete="email" value={form.email} onChange={updateField('email')} />
          </label>
        </div>
        <div className="two-cols">
          <label>
            Username
            <input required minLength="3" autoComplete="username" value={form.username} onChange={updateField('username')} />
          </label>
          <label>
            Password
            <input required minLength="8" type="password" autoComplete="new-password" value={form.password} onChange={updateField('password')} />
          </label>
        </div>
        <label>
          No. HP
          <input autoComplete="tel" value={form.phone} onChange={updateField('phone')} />
        </label>
        <label>
          Level
          <select value={form.interestLevel} onChange={updateField('interestLevel')}>
            <option value="Pemula">Pemula</option>
            <option value="Menengah">Menengah</option>
            <option value="Lanjutan">Lanjutan</option>
          </select>
        </label>
        <label>
          Catatan
          <textarea rows="3" value={form.notes} onChange={updateField('notes')} />
        </label>
        <button type="submit" className="primary-btn">Daftar sekarang</button>
      </form>
    </section>
  )
}
