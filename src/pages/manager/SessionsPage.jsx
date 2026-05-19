import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { Avatar } from '../../components/Avatar'
import { formatDate, daysUntil, SCORE_LABELS } from '../../lib/utils'
import { checkAndAwardBadges } from '../../lib/badges'
import {
  IconPlus, IconX, IconCalendar, IconCheck,
  IconCalendarPlus, IconAlertCircle, IconBook2,
} from '@tabler/icons-react'

export default function SessionsPage() {
  const { profile } = useAuth()
  const [sessions, setSessions] = useState([])
  const [vendeurs, setVendeurs] = useState([])
  const [dojos, setDojos] = useState([])
  const [comps, setComps] = useState([]) // competences avec sous_competences
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const [modal, setModal] = useState(null) // null | 'new' | { type: 'validate', session }
  const [form, setForm] = useState({ vendeurId: '', dojoId: '', sousCompId: '', scheduledDate: '', notes: '', objectif: '' })
  const [saving, setSaving] = useState(false)

  const [valScore, setValScore] = useState(0)
  const [valUpdating, setValUpdating] = useState(false)

  useEffect(() => { if (profile?.structure_id) load() }, [profile?.structure_id])

  async function load() {
    const [{ data: rawSessions }, { data: vendData }, { data: dojoData }, { data: compData }] = await Promise.all([
      supabase.from('coaching_sessions')
        .select('*')
        .eq('structure_id', profile.structure_id)
        .order('scheduled_date', { ascending: false }),
      supabase.from('profiles')
        .select('id, full_name, poste')
        .eq('structure_id', profile.structure_id)
        .eq('role', 'vendeur'),
      supabase.from('dojos')
        .select('id, titre')
        .eq('structure_id', profile.structure_id),
      supabase.from('competences')
        .select('id, title, numero')
        .eq('structure_id', profile.structure_id)
        .order('numero'),
    ])

    const compIds = (compData || []).map(c => c.id)
    const { data: scData } = compIds.length
      ? await supabase.from('sous_competences').select('id, title, competence_id').in('competence_id', compIds)
      : { data: [] }

    const vendeurMap = {}
    ;(vendData || []).forEach(v => { vendeurMap[v.id] = v })
    const dojoMap = {}
    ;(dojoData || []).forEach(d => { dojoMap[d.id] = d })
    const scMap = {}
    ;(scData || []).forEach(sc => { scMap[sc.id] = sc })

    const enriched = (rawSessions || []).map(s => ({
      ...s,
      profiles: vendeurMap[s.vendeur_id] || null,
      dojos: s.dojo_id ? (dojoMap[s.dojo_id] || null) : null,
      sous_competences: s.sous_comp_id ? (scMap[s.sous_comp_id] || null) : null,
    }))

    const enrichedComps = (compData || []).map(c => ({
      ...c,
      sous_competences: (scData || []).filter(sc => sc.competence_id === c.id),
    }))

    setSessions(enriched)
    setVendeurs(vendData || [])
    setDojos(dojoData || [])
    setComps(enrichedComps)
    setLoading(false)
  }

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function openNew() {
    setForm({
      vendeurId: vendeurs[0]?.id || '',
      dojoId: '',
      sousCompId: '',
      scheduledDate: '',
      notes: '',
      objectif: '',
    })
    setModal('new')
  }

  async function createSession() {
    if (!form.vendeurId || !form.scheduledDate) return
    setSaving(true)
    const { data: inserted, error } = await supabase.from('coaching_sessions').insert({
      structure_id: profile.structure_id,
      vendeur_id: form.vendeurId,
      dojo_id: form.dojoId || null,
      sous_comp_id: form.sousCompId || null,
      scheduled_date: form.scheduledDate,
      notes: form.notes || null,
      objectif: form.objectif || null,
      status: 'planned',
    }).select('*').single()

    if (!error && inserted) {
      const vendeurMap = {}
      vendeurs.forEach(v => { vendeurMap[v.id] = v })
      const dojoMap = {}
      dojos.forEach(d => { dojoMap[d.id] = d })
      const scMap = {}
      comps.forEach(c => c.sous_competences?.forEach(sc => { scMap[sc.id] = sc }))

      const enriched = {
        ...inserted,
        profiles: vendeurMap[inserted.vendeur_id] || null,
        dojos: inserted.dojo_id ? (dojoMap[inserted.dojo_id] || null) : null,
        sous_competences: inserted.sous_comp_id ? (scMap[inserted.sous_comp_id] || null) : null,
      }
      setSessions(prev => [enriched, ...prev].sort((a, b) =>
        new Date(b.scheduled_date) - new Date(a.scheduled_date)
      ))
    }
    setSaving(false)
    setModal(null)
  }

  async function validateSession() {
    if (!modal?.session) return
    setValUpdating(true)
    const session = modal.session

    await supabase.from('coaching_sessions')
      .update({ status: 'validated', validated_at: new Date().toISOString() })
      .eq('id', session.id)

    if (valScore > 0 && session.sous_comp_id) {
      await supabase.from('evaluations').upsert({
        vendeur_id: session.vendeur_id,
        sous_competence_id: session.sous_comp_id,
        score: valScore,
        evaluated_by: profile.id,
        evaluated_at: new Date().toISOString(),
      }, { onConflict: 'vendeur_id,sous_competence_id' })

      await checkAndAwardBadges(session.vendeur_id, profile.structure_id)
    }

    setSessions(prev => prev.map(s =>
      s.id === session.id ? { ...s, status: 'validated', validated_at: new Date().toISOString() } : s
    ))
    setValUpdating(false)
    setValScore(0)
    setModal(null)
  }

  async function toggleObjectifAtteint(sessionId, current) {
    const next = !current
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, objectif_atteint: next } : s))
    await supabase.from('coaching_sessions').update({ objectif_atteint: next }).eq('id', sessionId)
  }

  async function toggleDojoRealise(sessionId, current) {
    const next = !current
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, dojo_realise: next } : s))
    await supabase.from('coaching_sessions').update({ dojo_realise: next }).eq('id', sessionId)
  }

  const today = new Date().toISOString().split('T')[0]

  const filtered = sessions.filter(s => {
    if (filter === 'upcoming') return s.status === 'planned' && s.scheduled_date >= today
    if (filter === 'past') return s.status === 'validated' || s.scheduled_date < today
    return true
  })

  const pastUnvalidated = sessions.filter(s => s.status === 'planned' && s.scheduled_date < today)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '18px 24px 14px', background: '#fff', borderBottom: '1px solid var(--ln)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0, boxShadow: '0 1px 4px rgba(7,40,32,.04)',
      }}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 600, color: 'var(--fi)' }}>Sessions de coaching</div>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 2 }}>
            Planifiez et validez les sessions avec votre équipe
          </div>
        </div>
        <button onClick={openNew} style={btnPrimary}>
          <IconPlus size={15} /> Programmer une session
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

        {/* Alerte sessions passées non validées */}
        {pastUnvalidated.length > 0 && (
          <div style={{
            background: '#FEF9C3', border: '1px solid #FDE68A', borderRadius: 10,
            padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <IconAlertCircle size={16} color="#D97706" />
            <span style={{ fontSize: 12, color: '#92400E', fontWeight: 500 }}>
              {pastUnvalidated.length} session{pastUnvalidated.length > 1 ? 's' : ''} passée{pastUnvalidated.length > 1 ? 's' : ''} en attente de validation
            </span>
          </div>
        )}

        {/* Filtres */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {[['all', 'Toutes'], ['upcoming', 'À venir'], ['past', 'Passées']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                cursor: 'pointer', border: 'none',
                background: filter === key ? 'var(--forest)' : 'var(--bg)',
                color: filter === key ? 'var(--fluo)' : 'var(--mu)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--mu)' }}>Chargement…</div>}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <IconCalendar size={40} color="var(--mu)" style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fi)', marginBottom: 6 }}>Aucune session</div>
            <div style={{ fontSize: 13, color: 'var(--mu)' }}>
              {filter === 'all' ? 'Programmez votre première session de coaching' : 'Aucune session dans cette catégorie'}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(s => {
            const isPlanned = s.status === 'planned'
            const isValidated = s.status === 'validated'
            const borderColor = isValidated ? '#22C55E' : 'var(--forest)'

            return (
              <div key={s.id} style={{
                background: '#fff', borderRadius: 12, boxShadow: 'var(--sh)',
                padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14,
                borderLeft: `3px solid ${borderColor}`,
              }}>
                {/* Date */}
                <div style={{ width: 44, textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1, color: isValidated ? '#22C55E' : 'var(--forest)' }}>
                    {new Date(s.scheduled_date + 'T00:00:00').getDate()}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--mu)', textTransform: 'uppercase' }}>
                    {new Date(s.scheduled_date + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'short' })}
                  </div>
                </div>

                <div style={{ width: 1, height: 36, background: 'var(--ln)', flexShrink: 0 }} />

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Avatar name={s.profiles?.full_name} id={s.vendeur_id} size={22} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fi)' }}>
                      {s.profiles?.full_name}
                    </span>
                    {s.profiles?.poste && (
                      <>
                        <span style={{ fontSize: 11, color: 'var(--mu)' }}>·</span>
                        <span style={{ fontSize: 11, color: 'var(--mu)' }}>{s.profiles.poste}</span>
                      </>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {s.dojos?.titre && (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#DBEAFE', color: '#1E40AF', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <IconBook2 size={10} />{s.dojos.titre}
                      </span>
                    )}
                    {s.sous_competences?.title && (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--bg)', color: 'var(--fi)', fontWeight: 500 }}>
                        {s.sous_competences.title}
                      </span>
                    )}
                    {s.notes && (
                      <span style={{ fontSize: 11, color: 'var(--mu)', fontStyle: 'italic' }}>{s.notes}</span>
                    )}
                  </div>
                  {s.objectif && (
                    <div style={{ fontSize: 11, color: 'var(--mu)', fontStyle: 'italic', marginTop: 5 }}>
                      🎯 {s.objectif}
                    </div>
                  )}
                </div>

                {/* Status / Action */}
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  {isPlanned && (
                    <>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#DBEAFE', color: '#1E40AF' }}>
                        À venir
                      </span>
                      <button
                        onClick={() => { setModal({ type: 'validate', session: s }); setValScore(0) }}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                          cursor: 'pointer', border: 'none', background: 'var(--forest)', color: 'var(--fluo)',
                        }}
                      >
                        <IconCheck size={14} /> Valider
                      </button>
                    </>
                  )}
                  {isValidated && (
                    <>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#DCFCE7', color: '#166534' }}>
                        <IconCheck size={12} /> Réalisée
                      </span>
                      {s.dojo_id && (
                        <button
                          onClick={() => toggleDojoRealise(s.id, s.dojo_realise)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                            cursor: 'pointer', border: 'none',
                            background: s.dojo_realise ? '#DCFCE7' : 'var(--bg)',
                            color: s.dojo_realise ? '#166534' : 'var(--mu)',
                          }}
                        >
                          {s.dojo_realise ? '✓ Dojo réalisé' : 'Dojo réalisé ?'}
                        </button>
                      )}
                      {s.objectif && (
                        <button
                          onClick={() => toggleObjectifAtteint(s.id, s.objectif_atteint)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                            cursor: 'pointer', border: 'none',
                            background: s.objectif_atteint ? '#DCFCE7' : '#FEF3C7',
                            color: s.objectif_atteint ? '#166534' : '#92400E',
                          }}
                        >
                          {s.objectif_atteint ? '✓ Objectif atteint' : '⏳ En attente'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal — Nouvelle session */}
      {modal === 'new' && (
        <Modal title="Programmer une session" onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Vendeur *">
              <select value={form.vendeurId} onChange={e => set('vendeurId', e.target.value)} style={inputStyle}>
                <option value="">Choisir un vendeur…</option>
                {vendeurs.map(v => <option key={v.id} value={v.id}>{v.full_name}</option>)}
              </select>
            </Field>
            <Field label="Date *">
              <input type="date" value={form.scheduledDate} onChange={e => set('scheduledDate', e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Compétence ciblée">
              <select value={form.sousCompId} onChange={e => set('sousCompId', e.target.value)} style={inputStyle}>
                <option value="">Aucune (optionnel)</option>
                {comps.map(comp => (
                  <optgroup key={comp.id} label={comp.title}>
                    {(comp.sous_competences || []).map(sc => (
                      <option key={sc.id} value={sc.id}>{sc.title}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Field>
            {dojos.length > 0 && (
              <Field label="Dojo associé">
                <select value={form.dojoId} onChange={e => set('dojoId', e.target.value)} style={inputStyle}>
                  <option value="">Aucun (optionnel)</option>
                  {dojos.map(d => <option key={d.id} value={d.id}>{d.titre}</option>)}
                </select>
              </Field>
            )}
            <Field label="Notes / Instructions">
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Ce que le vendeur doit travailler…"
                style={{ ...inputStyle, resize: 'none', height: 56 }}
              />
            </Field>
            <Field label="Objectif post-coaching">
              <textarea
                value={form.objectif}
                onChange={e => set('objectif', e.target.value)}
                placeholder="Ex : Réaliser 3 découvertes complètes en RDV client"
                style={{ ...inputStyle, resize: 'none', height: 68 }}
              />
            </Field>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={() => setModal(null)} style={btnGhost}>Annuler</button>
              <button
                onClick={createSession}
                disabled={saving || !form.vendeurId || !form.scheduledDate}
                style={{ ...btnPrimary, opacity: (!form.vendeurId || !form.scheduledDate) ? 0.5 : 1 }}
              >
                <IconCalendarPlus size={14} /> {saving ? 'Création…' : 'Programmer'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal — Valider session */}
      {modal?.type === 'validate' && (
        <Modal
          title="Valider la session"
          subtitle={`${modal.session.profiles?.full_name} — ${formatDate(modal.session.scheduled_date)}`}
          onClose={() => { setModal(null); setValScore(0) }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {modal.session.sous_comp_id ? (
              <>
                <div style={{ background: 'var(--bg)', borderRadius: 9, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mu)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.4px' }}>Compétence travaillée</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fi)' }}>
                    {modal.session.sous_competences?.title}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fi)', marginBottom: 8 }}>
                    Mettre à jour le score ? <span style={{ fontWeight: 400, color: 'var(--mu)' }}>(optionnel)</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => setValScore(star === valScore ? 0 : star)}
                        style={{
                          width: 38, height: 38, borderRadius: 9, border: 'none', cursor: 'pointer',
                          fontSize: 20, background: star <= valScore ? '#FEF9C3' : 'var(--bg)',
                          color: star <= valScore ? '#F59E0B' : 'var(--ln)', transition: 'all .1s',
                        }}
                      >★</button>
                    ))}
                  </div>
                  {valScore > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 8 }}>
                      Nouveau score :{' '}
                      <span style={{ fontWeight: 600, color: 'var(--fi)' }}>{SCORE_LABELS[valScore]}</span>
                      {valScore >= 3 && (
                        <span style={{ color: '#22C55E', marginLeft: 8 }}>→ Badge possible !</span>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--mu)', padding: '8px 0' }}>
                Aucune compétence ciblée pour cette session.
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={() => { setModal(null); setValScore(0) }} style={btnGhost}>Annuler</button>
              <button onClick={validateSession} disabled={valUpdating} style={btnPrimary}>
                <IconCheck size={14} /> {valUpdating ? 'Validation…' : 'Confirmer la session'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, subtitle, onClose, children }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(7,40,32,.35)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 16, padding: 24, width: 440, boxShadow: '0 16px 48px rgba(7,40,32,.2)', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fi)' }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 3 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mu)', padding: 2 }}>
            <IconX size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fi)' }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = {
  padding: '9px 12px', borderRadius: 9, border: '1px solid var(--ln)',
  fontSize: 13, background: 'var(--bg)', fontFamily: 'inherit', width: '100%',
  boxSizing: 'border-box',
}

const btnPrimary = {
  background: 'var(--forest)', color: 'var(--fluo)', border: 'none',
  padding: '9px 17px', borderRadius: 9, fontSize: 13, fontWeight: 600,
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
  boxShadow: '0 2px 8px rgba(11,61,46,.2)',
}

const btnGhost = {
  background: '#fff', color: 'var(--fi)', border: '1px solid var(--ln)',
  padding: '9px 14px', borderRadius: 9, fontSize: 13, cursor: 'pointer',
}
