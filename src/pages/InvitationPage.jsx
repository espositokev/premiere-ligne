import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Logo } from '../components/Logo'

export default function InvitationPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    setSubmitting(true)
    setError('')
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) { setError(err.message); setSubmitting(false); return }
    setDone(true)
    setTimeout(() => navigate('/mon-espace', { replace: true }), 1500)
  }

  if (loading) return (
    <div style={wrap}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--ln)', borderTopColor: 'var(--forest)', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 12px' }} />
        <div style={{ fontSize: 13, color: 'var(--mu)' }}>Connexion en cours…</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )

  if (!user) return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}><Logo /></div>
        <div style={{ background: '#FEE2E2', color: '#991B1B', fontSize: 13, padding: '14px 16px', borderRadius: 10, lineHeight: 1.6, textAlign: 'center' }}>
          Ce lien d'invitation est invalide ou a déjà été utilisé.<br />
          Contactez votre manager pour recevoir une nouvelle invitation.
        </div>
      </div>
    </div>
  )

  if (done) return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fi)', marginBottom: 8 }}>Compte activé !</div>
          <div style={{ fontSize: 13, color: 'var(--mu)' }}>Redirection vers votre espace…</div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 28 }}>
          <Logo />
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--fi)', letterSpacing: 0.3 }}>PREMIÈRE LIGNE</span>
        </div>

        <div style={{ fontSize: 21, fontWeight: 700, color: 'var(--fi)', marginBottom: 6 }}>
          Bienvenue sur Première Ligne
        </div>
        <div style={{ fontSize: 13, color: 'var(--mu)', marginBottom: 28, lineHeight: 1.6 }}>
          Choisissez un mot de passe pour accéder à votre espace vendeur.
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fi)' }}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="8 caractères minimum"
              required
              style={inputSt}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fi)' }}>Confirmer le mot de passe</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Répétez votre mot de passe"
              required
              style={inputSt}
            />
          </div>
          {error && (
            <div style={{ background: '#FEE2E2', color: '#991B1B', fontSize: 13, padding: '10px 14px', borderRadius: 9 }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={submitting} style={btnSt}>
            {submitting ? 'Activation…' : 'Activer mon compte →'}
          </button>
        </form>
      </div>
    </div>
  )
}

const wrap = { minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }
const card = { background: '#fff', borderRadius: 20, padding: 40, width: '100%', maxWidth: 440, boxShadow: 'var(--shm)' }
const inputSt = { padding: '11px 14px', borderRadius: 10, border: '1px solid var(--ln)', fontSize: 14, background: 'var(--bg)', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }
const btnSt = { background: 'var(--forest)', color: 'var(--fluo)', border: 'none', padding: 13, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(11,61,46,.2)' }
