export function AlertBanner({ message }) {
  if (!message.text) return null

  const isSuccess = message.type === 'success'
  return (
    <div
      className={`alert ${isSuccess ? 'success' : 'error'}`}
      role={isSuccess ? 'status' : 'alert'}
      aria-live={isSuccess ? 'polite' : 'assertive'}
    >
      {message.text}
    </div>
  )
}
