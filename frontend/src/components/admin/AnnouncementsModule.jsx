import { useState } from 'react'

import { emptyAnnouncement } from '../../lib/constants'
import { AnnouncementList } from '../common/AnnouncementList'

export function AnnouncementsModule({ announcements, onSubmit }) {
  const [form, setForm] = useState(emptyAnnouncement)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (await onSubmit(form)) setForm(emptyAnnouncement)
  }

  return (
    <section className="panel admin-module">
      <div className="admin-module-heading">
        <p>Komunikasi kelas</p>
        <h2>Pengumuman</h2>
        <span>Buat dan tinjau informasi terbaru untuk murid.</span>
      </div>
      <form onSubmit={handleSubmit} className="stacked-form">
        <label>
          Judul pengumuman
          <input
            required
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
        </label>
        <label>
          Isi pengumuman
          <textarea
            required
            rows="4"
            value={form.content}
            onChange={(event) => setForm({ ...form, content: event.target.value })}
          />
        </label>
        <button type="submit" className="primary-btn">Publikasikan</button>
      </form>
      <div className="list-box">
        <AnnouncementList announcements={announcements} />
      </div>
    </section>
  )
}
