import { apiRequest } from '../lib/api'
import { announceRegistrationSuccess } from '../lib/grades'
import { useAppData } from '../hooks/useAppData'
import { AnnouncementList } from '../components/common/AnnouncementList'
import { RegistrationForm } from '../components/public/RegistrationForm'

export function PublicPage() {
  const { admin, announcements, fetchStudents, showError, showSuccess } = useAppData()

  const handleRegister = async (form) => {
    try {
      const { response, result } = await apiRequest('/students/register', {
        method: 'POST',
        body: form,
      })

      if (!response.ok) {
        showError(result.message || 'Pendaftaran gagal.')
        return false
      }

      showSuccess('Pendaftaran berhasil. Gunakan username dan password yang dibuat untuk login sebagai murid.')
      announceRegistrationSuccess()
      if (admin) await fetchStudents()
      return true
    } catch (error) {
      showError(error.message || 'Pendaftaran gagal. Coba lagi.')
      return false
    }
  }

  return (
    <>
      <main className="content-grid">
        <RegistrationForm onSubmit={handleRegister} />
      </main>

      <section className="panel widetwo">
        <h2>Pengumuman</h2>
        <div className="list-box">
          <AnnouncementList announcements={announcements} />
        </div>
      </section>
    </>
  )
}
