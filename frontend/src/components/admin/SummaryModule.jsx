export function SummaryModule({ adminName, metrics }) {
  return (
    <section className="admin-module">
      <div className="admin-module-heading">
        <p>Ringkasan</p>
        <h2>Selamat datang, {adminName}</h2>
        <span>Pantau aktivitas akademi dari satu tempat.</span>
      </div>
      <section className="stats-grid admin-stats-grid">
        <article className="stat-card">
          <span>Total murid</span>
          <strong>{metrics.totalStudents}</strong>
        </article>
        <article className="stat-card">
          <span>Pengumuman</span>
          <strong>{metrics.totalAnnouncements}</strong>
        </article>
        <article className="stat-card">
          <span>Nilai rata-rata</span>
          <strong>{metrics.averageScore}</strong>
        </article>
      </section>
    </section>
  )
}
