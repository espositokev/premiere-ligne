import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Logo } from '../../components/Logo'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: authError } = await signIn(email, password)

    if (authError) {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
      return
    }

    // Redirect based on role (profile loaded by AuthContext)
    // We use a small delay to let AuthContext fetch the profile
    setTimeout(() => {
      navigate('/', { replace: true })
    }, 300)
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
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 6 }}>
            <Logo />
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fi)', letterSpacing: 0.3 }}>
              PREMIÈRE LIGNE
            </div>
          </div>
          <div style={{ fontSize: 14, fontStyle: 'italic', color: '#8A8D88' }}>
            On forme là où ça se joue
          </div>
        </div>

        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--fi)', marginBottom: 6 }}>
          Connexion
        </div>
        <div style={{ fontSize: 13, color: 'var(--mu)', marginBottom: 28 }}>
          Entrez vos identifiants pour accéder à la plateforme
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
                transition: 'border-color .2s',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--fi)' }}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
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
              fontWeight: 500,
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
              transition: 'background .2s',
            }}
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>

          <Link
            to="/forgot-password"
            style={{
              fontSize: 12,
              color: 'var(--mu)',
              textAlign: 'center',
              marginTop: 4,
              textDecoration: 'none',
              display: 'block',
            }}
          >
            Mot de passe oublié ?
          </Link>
        </form>
      </div>
    </div>
  )
}
