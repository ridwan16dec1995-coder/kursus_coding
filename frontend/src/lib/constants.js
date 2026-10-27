export const BRAND_NAME = '<R/one> Code Accademy'

export const emptyRegistration = {
  fullName: '',
  email: '',
  username: '',
  password: '',
  phone: '',
  school: '',
  interestLevel: 'Pemula',
  notes: '',
}

export const emptyAnnouncement = { title: '', content: '' }
export const emptyLogin = { username: '', password: '' }
export const emptyStudentLogin = { username: '', password: '' }
export const emptyForgotPassword = { email: '' }
export const emptyResetPassword = { password: '', confirmation: '' }

export const emptyProgress = {
  studentId: '',
  subject: '',
  score: '',
  notes: '',
}

export const emptyCourse = { name: '', description: '', status: 'aktif' }
export const emptyEnrollment = { studentId: '', courseId: '' }
export const emptyWeeklyGrade = { enrollmentId: '', weekNumber: '', grade: '', notes: '' }

export const adminModules = [
  { id: 'ringkasan', label: 'Ringkasan' },
  { id: 'murid', label: 'Murid' },
  { id: 'progress', label: 'Progress Belajar' },
  { id: 'kursus', label: 'Kursus & Pendaftaran' },
  { id: 'pengumuman', label: 'Pengumuman' },
]

export const gradeOptions = [
  {
    letter: 'A',
    score: 100,
    guidance: 'Sangat baik — murid dapat melanjutkan ke materi atau modul berikutnya.',
    action: 'Lanjut ke materi berikutnya',
    tone: 'excellent',
  },
  {
    letter: 'B',
    score: 80,
    guidance: 'Baik — murid dapat melanjutkan ke materi berikutnya sambil tetap berlatih.',
    action: 'Lanjut sambil tetap berlatih',
    tone: 'good',
  },
  {
    letter: 'C',
    score: 75,
    guidance: 'Perlu penguatan — murid perlu mengulang materi dan mendapat pendampingan sebelum melanjutkan.',
    action: 'Ulang materi dan pendampingan',
    tone: 'fair',
  },
  {
    letter: 'D',
    score: 60,
    guidance: 'Perlu perbaikan — murid wajib mengulang materi sebelum melanjutkan.',
    action: 'Ulang materi',
    tone: 'support',
  },
]
