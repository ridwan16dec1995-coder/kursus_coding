import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { SessionExpiredError, apiRequest, authedRequest } from '../lib/api'
import { useAppData } from './useAppData'

/** Aksi login dan logout untuk admin maupun murid, termasuk status proses. */
export function useAuthActions() {
  const navigate = useNavigate()
  const {
    admin,
    setAdmin,
    student,
    setStudent,
    showSuccess,
    showError,
    clearAdminData,
    clearStudentData,
    refreshAdminData,
  } = useAppData()

  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isStudentLoggingIn, setIsStudentLoggingIn] = useState(false)

  const loginAdmin = useCallback(async (credentials) => {
    setIsLoggingIn(true)
    try {
      const { response, result } = await authedRequest('/admin/login', {
        method: 'POST',
        body: credentials,
      })

      if (!response.ok) {
        showError(result.message || 'Login gagal.')
        return false
      }

      setAdmin({ username: result.username, csrfToken: result.csrfToken })
      navigate('/admin')
      await refreshAdminData()
      showSuccess(`Login berhasil sebagai ${result.username}.`)
      return true
    } catch (error) {
      // 401 kredensial salah sudah dijawab server; tampilkan pesannya apa adanya.
      showError(error instanceof SessionExpiredError
        ? (error.message || 'Username atau password salah.')
        : 'Login gagal. Coba lagi.')
      return false
    } finally {
      setIsLoggingIn(false)
    }
  }, [navigate, refreshAdminData, setAdmin, showError, showSuccess])

  const logoutAdmin = useCallback(async () => {
    try {
      const { response, result } = await authedRequest('/admin/logout', {
        method: 'POST',
        csrfToken: admin?.csrfToken,
      })
      if (response.ok) {
        showSuccess('Logout berhasil.')
      } else {
        showError(result.message || 'Logout tidak dapat diselesaikan.')
      }
    } catch {
      showError('Logout tidak dapat diselesaikan, tetapi akses lokal telah dibersihkan.')
    } finally {
      clearAdminData()
      navigate('/')
    }
  }, [admin, clearAdminData, navigate, showError, showSuccess])

  const loginStudent = useCallback(async (credentials) => {
    setIsStudentLoggingIn(true)
    try {
      const { response, result } = await authedRequest('/student/login', {
        method: 'POST',
        body: credentials,
      })

      if (!response.ok) {
        showError(result.message || 'Login murid gagal.')
        return false
      }

      setStudent({ ...result.student, csrfToken: result.csrfToken })
      navigate('/murid')
      showSuccess(`Login berhasil. Selamat datang, ${result.student.fullName}.`)
      return true
    } catch (error) {
      showError(error instanceof SessionExpiredError
        ? (error.message || 'Username atau password murid salah.')
        : 'Login murid gagal. Coba lagi.')
      return false
    } finally {
      setIsStudentLoggingIn(false)
    }
  }, [navigate, setStudent, showError, showSuccess])

  const logoutStudent = useCallback(async () => {
    try {
      const { response, result } = await authedRequest('/student/logout', {
        method: 'POST',
        csrfToken: student?.csrfToken,
      })
      if (response.ok) {
        showSuccess('Logout murid berhasil.')
      } else {
        showError(result.message || 'Logout murid tidak dapat diselesaikan.')
      }
    } catch {
      showError('Logout murid tidak dapat diselesaikan, tetapi akses lokal telah dibersihkan.')
    } finally {
      clearStudentData()
      navigate('/')
    }
  }, [student, clearStudentData, navigate, showError, showSuccess])

  const requestPasswordReset = useCallback(async (email) => {
    const { response, result } = await apiRequest('/student/forgot-password', {
      method: 'POST',
      body: { email },
    })
    if (response.ok) {
      showSuccess(result.message || 'Tautan reset telah dikirim.')
    } else {
      showError(result.message || 'Permintaan reset gagal.')
    }
    return response.ok
  }, [showError, showSuccess])

  const resetPassword = useCallback(async (token, password) => {
    const { response, result } = await apiRequest('/student/reset-password', {
      method: 'POST',
      body: { token, password },
    })
    if (response.ok) {
      showSuccess(result.message || 'Password berhasil diubah.')
    } else {
      showError(result.message || 'Password gagal diubah.')
    }
    return response.ok
  }, [showError, showSuccess])

  return {
    isLoggingIn,
    isStudentLoggingIn,
    loginAdmin,
    logoutAdmin,
    loginStudent,
    logoutStudent,
    requestPasswordReset,
    resetPassword,
  }
}
