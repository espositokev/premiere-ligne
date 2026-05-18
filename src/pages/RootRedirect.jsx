import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function RootRedirect() {
  const { user, profile, loading, profileLoading } = useAuth()

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  // Profil encore en cours de chargement → attendre sans bloquer toute l'app
  if (profileLoading) return null

  if (profile?.role === 'manager') return <Navigate to="/dashboard" replace />
  if (profile?.role === 'vendeur') return <Navigate to="/mon-espace" replace />

  // Pas de profil ou pas de structure → onboarding
  return <Navigate to="/onboarding" replace />
}
