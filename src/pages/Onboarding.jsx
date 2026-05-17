import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Logo } from '../components/Logo'

export default function Onboarding() {
  const { user, fetchProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', ville: '', fullName: '', poste: '',
  })

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.fullName.trim()) {
      setError('Veuillez remplir tous les champs.')
      return
    }
    setLoading(true)
    setError('')

    // 1. Créer la structure
    const { data: structure, error: sErr } = await supabase
      .from('structures')
      .insert({ name: form.name, ville: form.ville })
      .select()
      .single()

    if (sErr) { setError('Erreur lors de la création de la structure.'); setLoading(false); return }

    // 2. Mettre à jour le profil manager
    const { error: pErr } = await supabase
      .from('profiles')
      .update({
        structure_id: structure.id,
        full_name: form.fullName,
        role: 'manager',
        poste: form.poste || 'Manager',
      })
      .eq('id', user.id)

    if (pErr) { setError('Erreur lors de la mise à jour du profil.'); setLoading(false); return }

    await fetchProfile(user.id)
    navigate('/dashboard', { replace: true })
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: 40,
        width: 460, boxShadow: 'var(--shm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, justifyContent: 'center' }}>
          <Logo />
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fi)', letterSpacing: 0.3 }}>
            PREMIÈRE LIGNE
          </div>
        </div>

        {/* Steps indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32, marginTop: 24 }}>
          {[1, 2].map(s => (
            <div key={s} style={{
              flex: 1, height: 4, borderRadius: 10,
              background: s <= step ? 'var(--forest)' : 'var(--ln)',
              transition: 'background .3s',
            }} />
          ))}
        </div>

        {step === 1 && (
          <>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--fi)', marginBottom: 6 }}>
              Bienvenue sur Première Ligne
            </div>
            <div style={{ fontSize: 13, color: 'var(--mu)', marginBottom: 28 }}>
              Commençons par configurer votre structure commerciale
            </div>
            <form onSubmit={e => { e.preventDefault(); setStep(2) }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Nom de la concession / structure *">
                <input
                  value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="ex : Aramisauto Lyon" required
                  style={inputStyle}
                />
              </Field>
              <Field label="Ville">
                <input
                  value={form.ville} onChange={e => set('ville', e.target.value)}
                  placeholder="ex : Lyon" style={inputStyle}
                />
              </Field>
              <button type="submit" style={btnStyle}>
                Continuer →
              </button>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--fi)', marginBottom: 6 }}>
              Votre profil manager
            </div>
            <div style={{ fontSize: 13, color: 'var(--mu)', marginBottom: 28 }}>
              Ces informations apparaîtront dans l'application
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Votre nom complet *">
                <input
                  value={form.fullName} onChange={e => set('fullName', e.target.value)}
                  placeholder="ex : Kévin Esposito" required style={inputStyle}
                />
              </Field>
              <Field label="Poste">
                <input
                  value={form.poste} onChange={e => set('poste', e.target.value)}
                  placeholder="ex : Chef des ventes" style={inputStyle}
                />
              </Field>
              {error && (
                <div style={{ background: '#FEE2E2', color: '#991B1B', fontSize: 13, padding: '10px 14px', borderRadius: 9 }}>
                  {error}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setStep(1)} style={{
                  flex: 1, padding: 13, borderRadius: 10, border: '1px solid var(--ln)',
                  background: '#fff', fontSize: 14, cursor: 'pointer', color: 'var(--fi)',
                }}>
                  ← Retour
                </button>
                <button type="submit" disabled={loading} style={{ ...btnStyle, flex: 2 }}>
                  {loading ? 'Création…' : 'Créer mon espace'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--fi)' }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = {
  padding: '11px 14px', borderRadius: 10, border: '1px solid var(--ln)',
  fontSize: 14, background: 'var(--bg)', fontFamily: 'inherit',
}

const btnStyle = {
  background: 'var(--forest)', color: 'var(--fluo)', border: 'none',
  padding: 13, borderRadius: 10, fontSize: 14, fontWeight: 600,
  cursor: 'pointer', width: '100%', boxShadow: '0 2px 8px rgba(11,61,46,.2)',
}
