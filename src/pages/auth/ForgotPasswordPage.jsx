import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Logo } from '../../components/Logo'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { sendPasswordReset } = useAuth()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: resetError } = await sendPasswordReset(email)

    if (resetError) {
      setError('Une erreur est survenue. Vérifiez l\'adresse email.')
    } else {
      setSent(true)
    }
    setLoading(false)
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

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>📧</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--fi)', marginBottom: 8 }}>
              Email envoyé !
            </div>
            <div style={{ fontSize: 13, color: 'var(--mu)', marginBottom: 28, lineHeight: 1.6 }}>
              Un lien de réinitialisation a été envoyé à <strong>{email}</strong>.
              Vérifiez votre boîte mail (et vos spams).
            </div>
            <Link
              to="/login"
              style={{
                display: 'inline-block',
                background: 'var(--forest)',
                color: 'var(--fluo)',
                textDecoration: 'none',
                padding: '12px 24px',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--fi)', marginBottom: 6 }}>
              Mot de passe oublié
            </div>
            <div style={{ fontSize: 13, color: 'var(--mu)', marginBottom: 28 }}>
              Entrez votre email pour recevoir un lien de réinitialisation
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--fi)' }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="vous@premiereligne.fr"
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
                {loading ? 'Envoi…' : 'Envoyer le lien'}
              </button>

              <Link
                to="/login"
                style={{
                  fontSize: 12,
                  color: 'var(--mu)',
                  textAlign: 'center',
                  textDecoration: 'none',
                  display: 'block',
                }}
              >
                ← Retour à la connexion
              </Link>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
