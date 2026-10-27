// Use the Vercel same-origin proxy in production so session cookies are first-party.
export const API_BASE_URL = import.meta.env.DEV
  ? (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api')
  : '/api'

/** Dilempar saat sesi berakhir (HTTP 401) agar pemanggil dapat membersihkan state login. */
export class SessionExpiredError extends Error {
  constructor(message = 'Sesi telah berakhir. Silakan login kembali.') {
    super(message)
    this.name = 'SessionExpiredError'
  }
}

export async function readApiResponse(response) {
  const contentType = response.headers.get('content-type') || ''
  const body = await response.text()
  if (!contentType.includes('application/json')) {
    throw new Error(response.ok
      ? 'Server mengembalikan halaman yang tidak sesuai. Coba refresh halaman.'
      : `Server API tidak tersedia (HTTP ${response.status}).`)
  }
  try {
    return JSON.parse(body)
  } catch {
    throw new Error('Respons server tidak valid. Coba refresh halaman atau hubungi administrator.')
  }
}

/**
 * Pembungkus fetch untuk seluruh endpoint API.
 *
 * Mengembalikan `{ response, result }` agar pemanggil tetap dapat memeriksa
 * status HTTP, dan melempar SessionExpiredError pada 401 sehingga penanganan
 * sesi berakhir tidak perlu diulang di setiap handler.
 */
export async function apiRequest(path, { method = 'GET', body, csrfToken, credentials } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    credentials: credentials ?? (csrfToken ? 'include' : 'same-origin'),
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const result = await readApiResponse(response)
  if (response.status === 401) {
    throw new SessionExpiredError(result.message)
  }
  return { response, result }
}

/** Varian apiRequest yang selalu mengirim cookie sesi, untuk endpoint terproteksi. */
export function authedRequest(path, options = {}) {
  return apiRequest(path, { ...options, credentials: 'include' })
}
