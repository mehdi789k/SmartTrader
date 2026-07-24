import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store'

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore()
  const [hasStoredToken, setHasStoredToken] = useState(Boolean(localStorage.getItem('access_token')))

  useEffect(() => {
    const syncAuth = () => {
      setHasStoredToken(Boolean(localStorage.getItem('access_token')))
    }

    syncAuth()
    window.addEventListener('auth:changed', syncAuth)
    return () => window.removeEventListener('auth:changed', syncAuth)
  }, [])

  const isAllowed = isAuthenticated || hasStoredToken

  if (!isAllowed) {
    return <Navigate to='/login' replace />
  }

  return children
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
}

export default ProtectedRoute
