import { useCallback } from 'react'

import { SessionExpiredError, authedRequest } from '../lib/api'
import { useAppData } from './useAppData'

const SESSION_ENDED = 'Sesi admin telah berakhir. Silakan login kembali.'

/**
 * Mutasi data oleh admin.
 *
 * Setiap aksi mengembalikan boolean sehingga form pemanggil tahu kapan boleh
 * direset, dan sesi yang berakhir ditangani seragam di satu tempat.
 */
export function useAdminActions() {
  const {
    admin,
    showSuccess,
    showError,
    clearAdminData,
    fetchAnnouncements,
    fetchCourses,
    fetchStudents,
    fetchEnrollments,
  } = useAppData()

  const csrfToken = admin?.csrfToken

  const runMutation = useCallback(async ({ path, body, failureMessage, successMessage, refresh }) => {
    try {
      const { response, result } = await authedRequest(path, {
        method: 'POST',
        body,
        csrfToken,
      })

      if (!response.ok) {
        showError(result.message || failureMessage)
        return false
      }

      showSuccess(successMessage)
      if (refresh) await refresh()
      return true
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        clearAdminData(SESSION_ENDED)
        return false
      }
      showError(error.message || failureMessage)
      return false
    }
  }, [csrfToken, clearAdminData, showError, showSuccess])

  const publishAnnouncement = useCallback((form) => runMutation({
    path: '/announcements',
    body: form,
    failureMessage: 'Pengumuman gagal dibuat.',
    successMessage: 'Pengumuman berhasil dipublikasikan.',
    refresh: fetchAnnouncements,
  }), [runMutation, fetchAnnouncements])

  const saveProgress = useCallback((form) => {
    if (!form.studentId) {
      showError('Pilih murid terlebih dahulu.')
      return Promise.resolve(false)
    }

    return runMutation({
      path: `/students/${form.studentId}/progress`,
      body: { subject: form.subject, score: Number(form.score), notes: form.notes },
      failureMessage: 'Progress gagal disimpan.',
      successMessage: 'Nilai progress murid berhasil disimpan.',
      refresh: fetchStudents,
    })
  }, [runMutation, fetchStudents, showError])

  const createCourse = useCallback((form) => runMutation({
    path: '/courses',
    body: form,
    failureMessage: 'Kursus gagal dibuat.',
    successMessage: 'Kursus berhasil dibuat.',
    refresh: fetchCourses,
  }), [runMutation, fetchCourses])

  const createEnrollment = useCallback((form) => runMutation({
    path: '/enrollments',
    body: form,
    failureMessage: 'Pendaftaran kursus gagal.',
    successMessage: 'Siswa berhasil didaftarkan ke kursus.',
    refresh: () => Promise.all([fetchEnrollments(), fetchStudents()]),
  }), [runMutation, fetchEnrollments, fetchStudents])

  const createWeeklyGrade = useCallback((form) => runMutation({
    path: `/enrollments/${form.enrollmentId}/grades`,
    body: {
      weekNumber: Number(form.weekNumber),
      grade: form.grade,
      notes: form.notes,
    },
    failureMessage: 'Nilai mingguan gagal disimpan.',
    successMessage: 'Nilai mingguan berhasil disimpan.',
    refresh: () => Promise.all([fetchEnrollments(), fetchStudents()]),
  }), [runMutation, fetchEnrollments, fetchStudents])

  return {
    publishAnnouncement,
    saveProgress,
    createCourse,
    createEnrollment,
    createWeeklyGrade,
  }
}
