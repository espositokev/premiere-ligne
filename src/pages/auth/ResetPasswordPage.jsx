import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Logo } from '../../components/Logo'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const { updatePassword } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    const { error: updateError } = await updatePassword(password)

    if (updateError) {
      setError('Une erreur est survenue. Le lien a peut-être expiré.')
      setLoading(false)
      return
    }

    setDone(true)
    setTimeout(() => navigate('/login', { replace: true }), 2500)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--w)',
        borderRadius: 20,
        padding: 40,
        width: 400,
        boxShadow: 'var(--shm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, justifyContent: 'center' }}>
          <Logo />
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fi)', letterSpacing: 0.3 }}>
            PREMIÈRE LIGNE
          </div>
        </div>

        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--fi)', marginBottom: 8 }}>
              Mot de passe mis à jour !
            </div>
            <div style={{ fontSize: 13, color: 'var(--mu)' }}>
              Redirection vers la connexion…
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--fi)', marginBottom: 6 }}>
              Nouveau mot de passe
            </div>
            <div style={{ fontSize: 13, color: 'var(--mu)', marginBottom: 28 }}>
              Choisissez un nouveau mot de passe pour votre compte
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--fi)' }}>
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="8 caractères minimum"
                  required
                  style={{
                    padding: '11px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--ln)',
                    fontSize: 14,
                    background: 'var(--bg)',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--fi)' }}>
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    padding: '11px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--ln)',
                    fontSize: 14,
                    background: 'var(--bg)',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {error && (
                <div style={{
                  background: '#FEE2E2',
                  color: '#991B1B',
                  fontSize: 13,
                  padding: '10px 14px',
                  borderRadius: 9,
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  background: loading ? 'var(--mu)' : 'var(--forest)',
                  color: 'var(--fluo)',
                  border: 'none',
                  padding: 13,
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  width: '100%',
                  marginTop: 6,
                  boxShadow: '0 2px 8px rgba(11,61,46,.2)',
                }}
              >
                {loading ? 'Mise à jour…' : 'Enregistrer le mot de passe'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
