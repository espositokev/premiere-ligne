import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// Page racine "/" : redirige selon le rôle
export default function RootRedirect() {
  const { user, profile, loading } = useAuth()

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (profile?.role === 'manager') return <Navigate to="/dashboard" replace />
  return <Navigate to="/mon-espace" replace />
}
