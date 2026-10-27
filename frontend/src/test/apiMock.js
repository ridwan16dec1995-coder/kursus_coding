import { vi } from 'vitest'

/** Respons JSON palsu yang bentuknya sama seperti balasan Flask. */
export function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    text: async () => JSON.stringify(body),
  }
}

export const emptySession = { ok: true, authenticated: false }

/**
 * Pasang fetch tiruan yang merutekan berdasarkan path.
 *
 * `routes` memetakan potongan path ke respons atau fungsi
 * `(url, options) => response`. Path yang tidak terdaftar menghasilkan 404.
 */
export function mockFetch(routes) {
  const handler = vi.fn(async (url, options = {}) => {
    const match = Object.keys(routes).find((path) => url.includes(path))
    if (!match) return jsonResponse({ ok: false, message: `Rute tidak dimock: ${url}` }, 404)

    const route = routes[match]
    return typeof route === 'function' ? route(url, options) : route
  })

  vi.stubGlobal('fetch', handler)
  return handler
}

/** Rute minimum agar aplikasi dapat selesai memuat tanpa sesi aktif. */
export const baseRoutes = {
  '/announcements': jsonResponse({ items: [] }),
  '/courses': jsonResponse({ items: [] }),
  '/admin/session': jsonResponse(emptySession),
  '/student/session': jsonResponse(emptySession),
}
