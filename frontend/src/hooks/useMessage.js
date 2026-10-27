import { useCallback, useState } from 'react'

const emptyMessage = { type: '', text: '' }

/** Satu banner notifikasi global untuk seluruh aplikasi. */
export function useMessage() {
  const [message, setMessage] = useState(emptyMessage)

  const showSuccess = useCallback((text) => setMessage({ type: 'success', text }), [])
  const showError = useCallback((text) => setMessage({ type: 'error', text }), [])
  const clearMessage = useCallback(() => setMessage(emptyMessage), [])

  return { message, showSuccess, showError, clearMessage }
}
