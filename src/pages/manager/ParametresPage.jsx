import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { Avatar } from '../../components/Avatar'
import { DEFAULT_COMPETENCES } from '../../lib/competences-seed'
import { IconDeviceFloppy, IconUserPlus, IconUpload, IconX } from '@tabler/icons-react'

export default function ParametresPage() {
  const { profile, fetchProfile } = useAuth()
  const [structure, setStructure] = useState(null)
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [seedDone, setSeedDone] = useState(false)
  const [inviteModal, setInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', fullName: '', poste: '' })
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')
  const [form, setForm] = useState({ name: '', ville: '', type: '', marques: '' })

  useEffect(() => { if (profile?.structure_id) load() }, [profile?.structure_id])

  async function load() {
    const [{ data: s }, { data: t }, { data: comps }] = await Promise.all([
      supabase.from('structures').select('*').eq('id', profile.structure_id).single(),
      supabase.from('profiles').select('id, full_name, poste, role').eq('structure_id', profile.structure_id).eq('role', 'vendeur'),
      supabase.from('competences').select('id').eq('structure_id', profile.structure_id),
    ])
    setStructure(s)
    setTeam(t || [])
    if (s) setForm({ name: s.name || '', ville: s.ville || '', type: s.type || '', marques: s.marques || '' })
    setSeedDone((comps || []).length > 0)
    setLoading(false)
  }

  async function saveStructure() {
    setSaving(true)
    await supabase.from('structures').update({ name: form.name, ville: form.ville }).eq('id', profile.structure_id)
    await fetchProfile(profile.id)
    setSaving(false)
  }

  async function seedCompetences() {
    setSeeding(true)
    for (const comp of DEFAULT_COMPETENCES) {
      const { data: c } = await supabase.from('competences').insert({
        structure_id: profile.structure_id,
        numero: comp.numero,
        title: comp.title,
        order_index: comp.numero,
      }).select().single()
      if (!c) continue

      for (let i = 0; i < comp.sous.length; i++) {
        const { data: sc } = await supabase.from('sous_competences').insert({
          competence_id: c.id,
          title: comp.sous[i],
          order_index: i,
        }).select().single()
      }

      for (let i = 0; i < comp.dojos.length; i++) {
        await supabase.from('dojos').insert({
          structure_id: profile.structure_id,
          title: comp.dojos[i],
          competence_id: c.id,
          created_by: profile.id,
        })
      }
    }
    setSeedDone(true)
    setSeeding(false)
  }

  async function inviteVendeur() {
    if (!inviteForm.email || !inviteForm.fullName) return
    setInviting(true)
    setInviteMsg('')
    // Supabase signUp creates the account; the trigger creates the profile
    const { data, error } = await supabase.auth.signUp({
      email: inviteForm.email,
      password: Math.random().toString(36).slice(-12) + 'A1!',
      options: {
        emailRedirectTo: `${window.location.origin}/invitation`,
        data: {
          full_name: inviteForm.fullName,
          role: 'vendeur',
        },
      },
    })
    if (error) {
      setInviteMsg('Erreur : ' + error.message)
      setInviting(false)
      return
    }
    if (data?.user) {
      await supabase.from('profiles').update({
        structure_id: profile.structure_id,
        poste: inviteForm.poste || 'Commercial',
        full_name: inviteForm.fullName,
        role: 'vendeur',
      }).eq('id', data.user.id)
    }
    setInviteMsg(`✅ Compte créé ! Partagez l'email ${inviteForm.email} à votre vendeur — il pourra se connecter avec le lien d'activation reçu par email et définir son mot de passe.`)
    setInviting(false)
    setInviteForm({ email: '', fullName: '', poste: '' })
    load()
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={hdr}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 600, color: 'var(--fi)' }}>Paramètres</div>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 2 }}>Configuration de votre structure — {structure?.name}</div>
        </div>
        <button onClick={saveStructure} disabled={saving} style={btnPrimary}>
          <IconDeviceFloppy size={15} />{saving ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--mu)' }}>Chargement…</div>}

        {!loading && (
          <>
            {/* Identité */}
            <Section title="Identité de la structure">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Nom de la structure">
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={inputSt} />
                </Field>
                <Field label="Ville">
                  <input value={form.ville} onChange={e => setForm(p => ({ ...p, ville: e.target.value }))} style={inputSt} />
                </Field>
              </div>
            </Section>

            {/* Compétences */}
            <Section title="Matrice de compétences">
              {seedDone ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#DCFCE7', borderRadius: 10 }}>
                  <span style={{ fontSize: 20 }}>✅</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#166534' }}>12 compétences automobiles initialisées</div>
                    <div style={{ fontSize: 12, color: '#166534', opacity: 0.8, marginTop: 2 }}>
                      Accueil, Découverte, Présentation, Financement, Closing… et bien plus.
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 13, color: 'var(--mu)', marginBottom: 16, lineHeight: 1.6 }}>
                    Initialisez les <strong>12 compétences automobiles</strong> standard avec leurs sous-compétences et Dojos associés. Vous pourrez les personnaliser ensuite.
                  </div>
                  <button onClick={seedCompetences} disabled={seeding} style={btnPrimary}>
                    {seeding ? '⏳ Initialisation en cours…' : '🚀 Initialiser les 12 compétences'}
                  </button>
                  <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 8 }}>
                    Accueil · Découverte · Présentation · Essai · Financement · Reprise · Closing · Livraison · Communication · Organisation · Prospection · Posture
                  </div>
                </div>
              )}
            </Section>

            {/* Équipe */}
            <Section title="Gestion de l'équipe">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--mu)' }}>{team.length} vendeur{team.length > 1 ? 's' : ''} actif{team.length > 1 ? 's' : ''}</div>
                <button onClick={() => setInviteModal(true)} style={btnPrimary}>
                  <IconUserPlus size={15} />Inviter un vendeur
                </button>
              </div>

              {team.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', background: 'var(--bg)', borderRadius: 10 }}>
                  <div style={{ fontSize: 13, color: 'var(--mu)' }}>Aucun vendeur dans l'équipe — invitez votre premier vendeur.</div>
                </div>
              ) : (
                <div style={{ background: 'var(--bg)', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px', padding: '8px 16px', fontSize: 10, fontWeight: 600, color: 'var(--mu)', letterSpacing: '.5px', textTransform: 'uppercase', borderBottom: '1px solid var(--ln)' }}>
                    <span>Vendeur</span><span>Poste</span><span>Action</span>
                  </div>
                  {team.map((v, i) => (
                    <div key={v.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px', padding: '10px 16px', borderBottom: i < team.length - 1 ? '1px solid var(--ln)' : 'none', alignItems: 'center', background: '#fff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={v.full_name} id={v.id} size={28} />
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fi)' }}>{v.full_name}</div>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--mu)' }}>{v.poste || 'Commercial'}</div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#DBEAFE', color: '#1E40AF' }}>Vendeur</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </>
        )}
      </div>

      {/* Modal inviter vendeur */}
      {inviteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,40,32,.35)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}
          onClick={() => { setInviteModal(false); setInviteMsg('') }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: 440, boxShadow: '0 16px 48px rgba(7,40,32,.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fi)' }}>Inviter un vendeur</div>
              <button onClick={() => { setInviteModal(false); setInviteMsg('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mu)' }}><IconX size={18} /></button>
            </div>
            {inviteMsg ? (
              <div>
                <div style={{ background: '#DCFCE7', color: '#166534', fontSize: 13, padding: '14px 16px', borderRadius: 10, lineHeight: 1.6, marginBottom: 16 }}>{inviteMsg}</div>
                <button onClick={() => { setInviteModal(false); setInviteMsg('') }} style={{ ...btnPrimary, width: '100%', justifyContent: 'center' }}>Fermer</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field label="Prénom et nom *">
                  <input value={inviteForm.fullName} onChange={e => setInviteForm(p => ({ ...p, fullName: e.target.value }))} placeholder="ex : Thomas Martin" style={inputSt} />
                </Field>
                <Field label="Email *">
                  <input type="email" value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} placeholder="thomas@votre-concession.fr" style={inputSt} />
                </Field>
                <Field label="Poste">
                  <input value={inviteForm.poste} onChange={e => setInviteForm(p => ({ ...p, poste: e.target.value }))} placeholder="ex : Commercial VN" style={inputSt} />
                </Field>
                <div style={{ fontSize: 11, color: 'var(--mu)', background: 'var(--bg)', padding: '10px 12px', borderRadius: 8, lineHeight: 1.5 }}>
                  ℹ️ Un email d'activation sera envoyé au vendeur. Il pourra définir son propre mot de passe en cliquant sur le lien.
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => setInviteModal(false)} style={{ padding: '9px 16px', borderRadius: 9, border: '1px solid var(--ln)', background: '#fff', fontSize: 13, cursor: 'pointer' }}>Annuler</button>
                  <button onClick={inviteVendeur} disabled={inviting} style={{ ...btnPrimary, boxShadow: 'none' }}>
                    {inviting ? 'Création…' : 'Créer le compte'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, boxShadow: 'var(--sh)', padding: 20, marginBottom: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fi)', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--ln)' }}>{title}</div>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fi)' }}>{label}</label>
      {children}
    </div>
  )
}

const hdr = { padding: '18px 24px 14px', background: '#fff', borderBottom: '1px solid var(--ln)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, boxShadow: '0 1px 4px rgba(7,40,32,.04)' }
const btnPrimary = { background: 'var(--forest)', color: 'var(--fluo)', border: 'none', padding: '9px 17px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(11,61,46,.2)' }
const inputSt = { padding: '9px 12px', borderRadius: 9, border: '1px solid var(--ln)', fontSize: 13, background: 'var(--bg)', fontFamily: 'inherit', width: '100%' }
