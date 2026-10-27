import { describe, expect, it, vi } from 'vitest'

import { SessionExpiredError, apiRequest, readApiResponse } from './api'
import { jsonResponse } from '../test/apiMock'

function htmlResponse(status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'text/html' },
    text: async () => '<!doctype html><title>Oops</title>',
  }
}

describe('readApiResponse', () => {
  it('mengurai body JSON yang valid', async () => {
    await expect(readApiResponse(jsonResponse({ ok: true }))).resolves.toEqual({ ok: true })
  })

  it('menolak halaman HTML walaupun statusnya 200', async () => {
    await expect(readApiResponse(htmlResponse())).rejects.toThrow(/tidak sesuai/)
  })

  it('menyebutkan status ketika API membalas HTML dengan status error', async () => {
    await expect(readApiResponse(htmlResponse(502))).rejects.toThrow(/HTTP 502/)
  })

  it('menolak JSON yang rusak', async () => {
    const broken = {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      text: async () => '{bukan json',
    }
    await expect(readApiResponse(broken)).rejects.toThrow(/tidak valid/)
  })
})

describe('apiRequest', () => {
  it('melempar SessionExpiredError pada HTTP 401', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ message: 'Silakan login.' }, 401)))

    await expect(apiRequest('/students')).rejects.toBeInstanceOf(SessionExpiredError)
  })

  it('mengirim token CSRF dan cookie pada permintaan yang membutuhkannya', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    await apiRequest('/announcements', {
      method: 'POST',
      body: { title: 'Halo' },
      csrfToken: 'token-rahasia',
    })

    const [, options] = fetchMock.mock.calls[0]
    expect(options.headers['X-CSRF-Token']).toBe('token-rahasia')
    expect(options.headers['Content-Type']).toBe('application/json')
    expect(options.credentials).toBe('include')
    expect(options.body).toBe(JSON.stringify({ title: 'Halo' }))
  })

  it('tidak memasang header Content-Type pada permintaan tanpa body', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ items: [] }))
    vi.stubGlobal('fetch', fetchMock)

    await apiRequest('/courses')

    const [, options] = fetchMock.mock.calls[0]
    expect(options.headers['Content-Type']).toBeUndefined()
    expect(options.body).toBeUndefined()
  })
})
