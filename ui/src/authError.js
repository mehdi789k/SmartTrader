export const isAuthError = (error) => {
  const status = error?.response?.status
  const detail = error?.response?.data?.detail || error?.response?.data?.message || ''
  const message = `${detail}`.toLowerCase()

  if (status === 401) {
    const isTokenIssue = message.includes('token') || message.includes('authorization') || message.includes('توکن')
    const isAuthFailure = message.includes('unauthorized') || message.includes('not authenticated') || message.includes('اعتبار')
    return isTokenIssue || isAuthFailure
  }

  if (message.includes('token') || message.includes('authorization') || message.includes('unauthorized')) {
    return true
  }

  return false
}
