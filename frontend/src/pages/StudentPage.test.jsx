import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../App'
import { baseRoutes, jsonResponse, mockFetch } from '../test/apiMock'

function renderApp(initialPath = '/murid') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), speak: vi.fn() })
  vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(text) { this.text = text } })
})

describe('permintaan tautan reset password', () => {
  it('mengirim email murid dan menampilkan pesan berhasil', async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetch({
      ...baseRoutes,
      '/student/forgot-password': jsonResponse({
        ok: true,
        message: 'Jika email terdaftar, tautan pengaturan ulang password telah dikirim.',
      }),
    })
    renderApp('/murid')

    await user.click(await screen.findByRole('button', { name: 'Lupa password?' }))
    await user.type(screen.getByLabelText('Email akun murid'), 'murid@example.com')
    await user.click(screen.getByRole('button', { name: 'Kirim tautan reset' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Jika email terdaftar')

    const call = fetchMock.mock.calls.find(([url]) => url.includes('/student/forgot-password'))
    expect(JSON.parse(call[1].body)).toEqual({ email: 'murid@example.com' })
  })

  it('menampilkan pesan layanan email belum siap ketika server membalas 503', async () => {
    const user = userEvent.setup()
    mockFetch({
      ...baseRoutes,
      '/student/forgot-password': jsonResponse({
        ok: false,
        message: 'Layanan email reset password belum siap. Hubungi administrator.',
      }, 503),
    })
    renderApp('/murid')

    await user.click(await screen.findByRole('button', { name: 'Lupa password?' }))
    await user.type(screen.getByLabelText('Email akun murid'), 'murid@example.com')
    await user.click(screen.getByRole('button', { name: 'Kirim tautan reset' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('belum siap')
  })
})

describe('mengganti password dari tautan email', () => {
  it('mengirim token dan password baru lalu membersihkan token dari URL', async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetch({
      ...baseRoutes,
      '/student/reset-password': jsonResponse({ ok: true, message: 'Password berhasil diubah. Silakan login kembali.' }),
    })
    renderApp('/murid?resetToken=token-contoh')

    expect(await screen.findByRole('heading', { name: 'Buat password baru' })).toBeInTheDocument()

    await user.type(screen.getByLabelText('Password baru'), 'password-baru-123')
    await user.type(screen.getByLabelText('Konfirmasi password'), 'password-baru-123')
    await user.click(screen.getByRole('button', { name: 'Simpan password baru' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Password berhasil diubah')

    const call = fetchMock.mock.calls.find(([url]) => url.includes('/student/reset-password'))
    expect(JSON.parse(call[1].body)).toEqual({
      token: 'token-contoh',
      password: 'password-baru-123',
    })

    await waitFor(() => expect(screen.getByRole('button', { name: 'Masuk sebagai murid' })).toBeInTheDocument())
  })

  it('menolak password yang konfirmasinya berbeda tanpa mengirim permintaan', async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetch({ ...baseRoutes })
    renderApp('/murid?resetToken=token-contoh')

    await user.type(await screen.findByLabelText('Password baru'), 'password-baru-123')
    await user.type(screen.getByLabelText('Konfirmasi password'), 'password-berbeda')
    await user.click(screen.getByRole('button', { name: 'Simpan password baru' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Konfirmasi password tidak cocok.')
    expect(fetchMock.mock.calls.some(([url]) => url.includes('/student/reset-password'))).toBe(false)
  })

  it('menampilkan pesan server ketika tautan reset sudah tidak berlaku', async () => {
    const user = userEvent.setup()
    mockFetch({
      ...baseRoutes,
      '/student/reset-password': jsonResponse({
        ok: false,
        message: 'Tautan reset tidak valid atau sudah kedaluwarsa.',
      }, 400),
    })
    renderApp('/murid?resetToken=token-kedaluwarsa')

    await user.type(await screen.findByLabelText('Password baru'), 'password-baru-123')
    await user.type(screen.getByLabelText('Konfirmasi password'), 'password-baru-123')
    await user.click(screen.getByRole('button', { name: 'Simpan password baru' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('sudah kedaluwarsa')
  })
})
