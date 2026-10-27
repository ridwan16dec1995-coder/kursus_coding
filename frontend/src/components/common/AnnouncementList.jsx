/**
 * Daftar pengumuman.
 *
 * `variant="article"` dipakai portal murid, `variant="list"` dipakai halaman
 * publik dan dashboard admin — markup lamanya memang berbeda.
 */
export function AnnouncementList({ announcements, variant = 'list' }) {
  if (announcements.length === 0) {
    return <p className="empty-state">Belum ada pengumuman.</p>
  }

  if (variant === 'article') {
    return announcements.map((item) => (
      <article key={item.id} className="announcement-item">
        <h3>{item.title}</h3>
        <p>{item.content}</p>
        <small>{item.createdAt}</small>
      </article>
    ))
  }

  return announcements.map((item) => (
    <div key={item.id} className="list-item">
      <div className="list-header">
        <strong>{item.title}</strong>
        <span>{item.createdAt}</span>
      </div>
      <p>{item.content}</p>
    </div>
  ))
}
