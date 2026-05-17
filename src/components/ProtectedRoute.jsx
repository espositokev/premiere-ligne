import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// Redirige vers /login si pas connecté
export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return children
}

// Redirige les managers et vendeurs vers leur espace respectif
export function RoleRoute({ children, requiredRole }) {
  const { profile, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!profile) return <Navigate to="/login" replace />
  if (requiredRole && profile.role !== requiredRole) {
    return <Navigate to={profile.role === 'manager' ? '/dashboard' : '/mon-espace'} replace />
  }
  return children
}

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 36,
          height: 36,
          border: '3px solid var(--ln)',
          borderTopColor: 'var(--forest)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 12px',
        }} />
        <div style={{ fontSize: 13, color: 'var(--mu)' }}>Chargement…</div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
