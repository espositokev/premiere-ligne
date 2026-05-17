import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function DebugLogout() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.signOut().then(() => {
      navigate('/login', { replace: true })
    })
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <p style={{ color: 'var(--mu)', fontSize: 14 }}>Déconnexion en cours…</p>
    </div>
  )
}
