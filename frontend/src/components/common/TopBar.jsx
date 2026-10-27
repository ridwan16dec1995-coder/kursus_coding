import { NavLink } from 'react-router-dom'

import { BRAND_NAME } from '../../lib/constants'

const portalLinks = [
  { to: '/', label: 'Pendaftaran Umum', end: true },
  { to: '/murid', label: 'Portal Murid', end: false },
  { to: '/admin', label: 'Portal Admin', end: false },
]

export function TopBar({ admin, student, isAuthLoading, onLogoutAdmin, onLogoutStudent }) {
  const isLoggedIn = Boolean(admin || student)

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Platform pembelajaran coding</p>
        <h1>{BRAND_NAME}</h1>
      </div>

      {!isLoggedIn && (
        <nav className="portal-links" aria-label="Portal aplikasi">
          {portalLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => (isActive ? 'is-active' : '')}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      )}

      <div className="topbar-meta">
        {admin ? (
          <>
            <span className="status-chip success">Admin: {admin.username}</span>
            <button type="button" className="secondary-btn" onClick={onLogoutAdmin}>Keluar</button>
          </>
        ) : student ? (
          <>
            <span className="status-chip success">Murid: {student.fullName}</span>
            <button type="button" className="secondary-btn" onClick={onLogoutStudent}>Keluar</button>
          </>
        ) : (
          <span className="status-chip muted">
            {isAuthLoading ? 'Memeriksa sesi...' : 'Belum login'}
          </span>
        )}
      </div>
    </header>
  )
}
