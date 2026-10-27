import { createContext, useCallback, useEffect, useMemo, useState } from 'react'

import { SessionExpiredError, apiRequest, authedRequest } from '../lib/api'
import { useMessage } from './useMessage'

export const AppDataContext = createContext(null)

const SESSION_ENDED = 'Sesi telah berakhir. Silakan login kembali.'

/**
 * Menyimpan sesi (admin/murid) dan data bersama aplikasi.
 *
 * Data publik (pengumuman, kursus) dimuat sekali saat aplikasi dibuka;
 * data admin dimuat hanya setelah sesi admin terverifikasi.
 */
export function AppDataProvider({ children }) {
  const { message, showSuccess, showError, clearMessage } = useMessage()

  const [admin, setAdmin] = useState(null)
  const [student, setStudent] = useState(null)
  const [students, setStudents] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [courses, setCourses] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [isAuthLoading, setIsAuthLoading] = useState(true)

  const clearAdminData = useCallback((text = '') => {
    setAdmin(null)
    setStudents([])
    setEnrollments([])
    if (text) showError(text)
  }, [showError])

  const clearStudentData = useCallback((text = '') => {
    setStudent(null)
    if (text) showError(text)
  }, [showError])

  const fetchAnnouncements = useCallback(async () => {
    const { response, result } = await apiRequest('/announcements')
    if (!response.ok) throw new Error(result.message || 'Gagal memuat pengumuman.')
    setAnnouncements(result.items || [])
  }, [])

  const fetchCourses = useCallback(async () => {
    const { response, result } = await apiRequest('/courses')
    if (!response.ok) throw new Error(result.message || 'Gagal memuat kursus.')
    setCourses(result.items || [])
  }, [])

  const fetchStudents = useCallback(async () => {
    try {
      const { response, result } = await authedRequest('/students')
      if (!response.ok) throw new Error(result.message || 'Gagal memuat data murid.')
      setStudents(result.items || [])
      return true
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        clearAdminData(SESSION_ENDED)
        return false
      }
      throw error
    }
  }, [clearAdminData])

  const fetchEnrollments = useCallback(async () => {
    try {
      const { response, result } = await authedRequest('/enrollments')
      if (!response.ok) throw new Error(result.message || 'Gagal memuat pendaftaran kursus.')
      setEnrollments(result.items || [])
      return true
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        clearAdminData(SESSION_ENDED)
        return false
      }
      throw error
    }
  }, [clearAdminData])

  const refreshAdminData = useCallback(
    () => Promise.all([fetchStudents(), fetchEnrollments()]),
    [fetchStudents, fetchEnrollments],
  )

  // Pulihkan sesi dan muat data publik saat aplikasi pertama kali dibuka.
  useEffect(() => {
    let active = true

    const loadApplication = async () => {
      try {
        await Promise.all([fetchAnnouncements(), fetchCourses()])

        const adminSession = await authedRequest('/admin/session')
        if (!active) return
        if (adminSession.response.ok && adminSession.result.authenticated) {
          setAdmin({
            username: adminSession.result.username,
            csrfToken: adminSession.result.csrfToken,
          })
          await refreshAdminData()
          return
        }

        const studentSession = await authedRequest('/student/session')
        if (!active) return
        if (studentSession.response.ok && studentSession.result.authenticated) {
          setStudent({
            ...studentSession.result.student,
            csrfToken: studentSession.result.csrfToken,
          })
        }
      } catch (error) {
        // Sesi yang sudah berakhir bukan kegagalan pemuatan: pengguna cukup login lagi.
        if (active && !(error instanceof SessionExpiredError)) {
          showError(error.message || 'Gagal memuat data dari server.')
        }
      } finally {
        if (active) setIsAuthLoading(false)
      }
    }

    loadApplication()
    return () => { active = false }
  }, [fetchAnnouncements, fetchCourses, refreshAdminData, showError])

  const value = useMemo(() => ({
    admin,
    setAdmin,
    student,
    setStudent,
    students,
    announcements,
    courses,
    enrollments,
    isAuthLoading,
    message,
    showSuccess,
    showError,
    clearMessage,
    clearAdminData,
    clearStudentData,
    fetchAnnouncements,
    fetchCourses,
    fetchStudents,
    fetchEnrollments,
    refreshAdminData,
  }), [
    admin, student, students, announcements, courses, enrollments, isAuthLoading,
    message, showSuccess, showError, clearMessage, clearAdminData, clearStudentData,
    fetchAnnouncements, fetchCourses, fetchStudents, fetchEnrollments, refreshAdminData,
  ])

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}
