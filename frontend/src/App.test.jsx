import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { baseRoutes, jsonResponse, mockFetch } from './test/apiMock'

function renderApp(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>,
  )
}

const adminSession = {
  ok: true,
  authenticated: true,
  username: 'admin-test',
  csrfToken: 'csrf-admin',
}

beforeEach(() => {
  // speechSynthesis tidak ada di jsdom; pendaftaran memanggilnya saat berhasil.
  vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), speak: vi.fn() })
  vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(text) { this.text = text } })
})

describe('routing portal', () => {
  it('menampilkan formulir pendaftaran pada halaman publik', async () => {
    mockFetch(baseRoutes)
    renderApp('/')

    expect(await screen.findByRole('heading', { name: 'Daftar Murid Baru' })).toBeInTheDocument()
  })

  it('menampilkan login admin pada /admin ketika belum ada sesi', async () => {
    mockFetch(baseRoutes)
    renderApp('/admin')

    expect(await screen.findByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Masuk ke dashboard' })).toBeInTheDocument()
  })

  it('menampilkan login murid pada /murid ketika belum ada sesi', async () => {
    mockFetch(baseRoutes)
    renderApp('/murid')

    expect(await screen.findByRole('button', { name: 'Masuk sebagai murid' })).toBeInTheDocument()
  })

  it('menampilkan form password baru ketika URL membawa resetToken', async () => {
    mockFetch(baseRoutes)
    renderApp('/murid?resetToken=token-contoh')

    expect(await screen.findByRole('heading', { name: 'Buat password baru' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Masuk sebagai murid' })).not.toBeInTheDocument()
  })

  it('mengarahkan rute tak dikenal kembali ke halaman publik', async () => {
    mockFetch(baseRoutes)
    renderApp('/halaman-yang-tidak-ada')

    expect(await screen.findByRole('heading', { name: 'Daftar Murid Baru' })).toBeInTheDocument()
  })
})

describe('pemulihan sesi', () => {
  it('membuka dashboard admin dan memuat datanya saat sesi admin masih aktif', async () => {
    mockFetch({
      ...baseRoutes,
      '/admin/session': jsonResponse(adminSession),
      '/students': jsonResponse({ items: [{ id: 1, fullName: 'Murid Satu', email: 'satu@example.com', progress: [] }] }),
      '/enrollments': jsonResponse({ items: [] }),
    })
    renderApp('/')

    expect(await screen.findByText('Admin: admin-test')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Selamat datang, admin-test' })).toBeInTheDocument()
  })

  it('membuka portal murid saat sesi murid masih aktif', async () => {
    mockFetch({
      ...baseRoutes,
      '/student/session': jsonResponse({
        ok: true,
        authenticated: true,
        csrfToken: 'csrf-murid',
        student: { id: 7, fullName: 'Murid Dua', username: 'murid-dua', email: 'dua@example.com', progress: [], courses: [] },
      }),
    })
    renderApp('/')

    expect(await screen.findByRole('heading', { name: 'Halo, Murid Dua' })).toBeInTheDocument()
  })

  it('tetap di halaman publik dan tidak menampilkan error saat tidak ada sesi', async () => {
    mockFetch(baseRoutes)
    renderApp('/')

    expect(await screen.findByText('Belum login')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('login admin', () => {
  it('menyimpan sesi lalu menampilkan dashboard', async () => {
    const user = userEvent.setup()
    mockFetch({
      ...baseRoutes,
      '/admin/login': jsonResponse({ ok: true, username: 'admin-test', csrfToken: 'csrf-admin' }),
      '/students': jsonResponse({ items: [] }),
      '/enrollments': jsonResponse({ items: [] }),
    })
    renderApp('/admin')

    await user.type(await screen.findByLabelText('Username'), 'admin-test')
    await user.type(screen.getByLabelText('Password'), 'password-test')
    await user.click(screen.getByRole('button', { name: 'Masuk ke dashboard' }))

    expect(await screen.findByRole('heading', { name: 'Selamat datang, admin-test' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Login berhasil sebagai admin-test.')
  })

  it('menampilkan pesan server dan tetap di form ketika kredensial salah', async () => {
    const user = userEvent.setup()
    mockFetch({
      ...baseRoutes,
      '/admin/login': jsonResponse({ ok: false, message: 'Username atau password salah' }, 401),
    })
    renderApp('/admin')

    await user.type(await screen.findByLabelText('Username'), 'admin-test')
    await user.type(screen.getByLabelText('Password'), 'salah')
    await user.click(screen.getByRole('button', { name: 'Masuk ke dashboard' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Username atau password salah')
    expect(screen.getByRole('button', { name: 'Masuk ke dashboard' })).toBeInTheDocument()
  })
})

describe('pendaftaran murid', () => {
  it('mengirim data form dan mengosongkannya setelah berhasil', async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetch({
      ...baseRoutes,
      '/students/register': jsonResponse({ ok: true, data: { id: 1 } }),
    })
    renderApp('/')

    await user.type(await screen.findByLabelText('Nama lengkap'), 'Murid Baru')
    await user.type(screen.getByLabelText('Email'), 'baru@example.com')
    await user.type(screen.getByLabelText('Username'), 'murid-baru')
    await user.type(screen.getByLabelText('Password'), 'password-aman')
    await user.click(screen.getByRole('button', { name: 'Daftar sekarang' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Pendaftaran berhasil')

    const registerCall = fetchMock.mock.calls.find(([url]) => url.includes('/students/register'))
    expect(JSON.parse(registerCall[1].body)).toMatchObject({
      fullName: 'Murid Baru',
      email: 'baru@example.com',
      username: 'murid-baru',
    })
    await waitFor(() => expect(screen.getByLabelText('Nama lengkap')).toHaveValue(''))
  })

  it('menampilkan pesan error dan mempertahankan isian ketika email sudah dipakai', async () => {
    const user = userEvent.setup()
    mockFetch({
      ...baseRoutes,
      '/students/register': jsonResponse({ ok: false, message: 'Email sudah terdaftar' }, 409),
    })
    renderApp('/')

    await user.type(await screen.findByLabelText('Nama lengkap'), 'Murid Baru')
    await user.type(screen.getByLabelText('Email'), 'baru@example.com')
    await user.type(screen.getByLabelText('Username'), 'murid-baru')
    await user.type(screen.getByLabelText('Password'), 'password-aman')
    await user.click(screen.getByRole('button', { name: 'Daftar sekarang' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Email sudah terdaftar')
    expect(screen.getByLabelText('Email')).toHaveValue('baru@example.com')
  })
})

describe('penanganan sesi berakhir', () => {
  it('mengeluarkan admin ke form login ketika API membalas 401', async () => {
    const user = userEvent.setup()
    mockFetch({
      ...baseRoutes,
      '/admin/session': jsonResponse(adminSession),
      '/students': jsonResponse({ items: [] }),
      '/enrollments': jsonResponse({ items: [] }),
      '/announcements': (url, options = {}) => (options.method === 'POST'
        ? jsonResponse({ ok: false, message: 'Silakan login sebagai admin terlebih dahulu.' }, 401)
        : jsonResponse({ items: [] })),
    })
    renderApp('/')

    await user.click(await screen.findByRole('button', { name: 'Pengumuman' }))
    await user.type(screen.getByLabelText('Judul pengumuman'), 'Kelas libur')
    await user.type(screen.getByLabelText('Isi pengumuman'), 'Libur minggu depan.')
    await user.click(screen.getByRole('button', { name: 'Publikasikan' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Sesi admin telah berakhir')
    expect(await screen.findByRole('button', { name: 'Masuk ke dashboard' })).toBeInTheDocument()
  })
})

describe('API tidak mengembalikan JSON', () => {
  it('menampilkan pesan yang dapat dibaca ketika server membalas HTML', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 502,
      headers: { get: () => 'text/html' },
      text: async () => '<!doctype html>',
    })))
    renderApp('/')

    expect(await screen.findByRole('alert')).toHaveTextContent('Server API tidak tersedia (HTTP 502)')
  })
})
