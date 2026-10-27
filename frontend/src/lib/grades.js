import { BRAND_NAME, gradeOptions } from './constants'

export function getScoreCategory(score) {
  return gradeOptions.find((grade) => grade.score === Number(score)) || {
    letter: null,
    action: 'Nilai lama perlu ditinjau',
    guidance: 'Nilai ini perlu ditinjau oleh admin sebelum ada arahan belajar berikutnya.',
    tone: 'support',
  }
}

export function getStudentProgressMessage(category) {
  if (category.letter === 'A' || category.letter === 'B') {
    return `Kamu dapat ${category.action.toLowerCase()}.`
  }

  return `Kamu perlu ${category.action.toLowerCase()}.`
}

export function formatAssessmentDate(value) {
  if (!value) return 'Tanggal penilaian belum tersedia'

  const date = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/** Rata-rata nilai dari daftar progress; null bila belum ada nilai. */
export function averageScoreOf(progress = []) {
  if (!progress.length) return null
  const total = progress.reduce((sum, item) => sum + Number(item.score || 0), 0)
  return Math.round(total / progress.length)
}

export function announceRegistrationSuccess() {
  if (!('speechSynthesis' in window)) return

  window.speechSynthesis.cancel()
  const announcement = new SpeechSynthesisUtterance(
    `Pendaftaran berhasil. Selamat datang di ${BRAND_NAME}.`,
  )
  announcement.lang = 'id-ID'
  announcement.rate = 0.95
  announcement.pitch = 1
  window.speechSynthesis.speak(announcement)
}
