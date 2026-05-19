import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { Avatar } from '../../components/Avatar'
import { formatDate } from '../../lib/utils'
import {
  IconPlus, IconX, IconCalendar, IconCheck,
  IconCalendarPlus, IconBook2, IconChevronRight,
} from '@tabler/icons-react'

function sessionStatus(s) {
  if (s.objectif_atteint) return 'terminee'
  if (s.dojo_realise) return 'en_cours'
  return 'planifiee'
}

const STATUS = {
  planifiee: { label: 'Planifiée', bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' },
  en_cours:  { label: 'En cours',  bg: '#FEF3C7', color: '#D97706', border: '#FDE68A' },
  terminee:  { label: 'Terminée',  bg: '#DCFCE7', color: '#166534', border: '#BBF7D0' },
}

export default function SessionsPage() {
  const { profile } = useAuth()
  const [sessions, setSessions] = useState([])
  const [vendeurs, setVendeurs] = useState([])
  const [dojos, setDojos] = useState([])
  const [comps, setComps] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const [modal, setModal] = useState(null) // null | 'new' | 'detail'
  const [form, setForm] = useState({ vendeurId: '', dojoId: '', sousCompId: '', scheduledDate: '', notes: '', objectif: '' })
  const [saving, setSaving] = useState(false)

  const [detailSession, setDetailSession] = useState(null)
  const [commentaire, setCommentaire] = useState('')
  const [savingComment, setSavingComment] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => { if (profile?.structure_id) load() }, [profile?.structure_id])

  async function load() {
    const [{ data: rawSessions }, { data: vendData }, { data: dojoData }, { data: compData }] = await Promise.all([
      supabase.from('coaching_sessions').select('*').eq('structure_id', profile.structure_id).order('scheduled_date', { ascending: false }),
      supabase.from('profiles').select('id, full_name, poste').eq('structure_id', profile.structure_id).eq('role', 'vendeur'),
      supabase.from('dojos').select('id, titre').eq('structure_id', profile.structure_id),
      supabase.from('competences').select('id, title, numero').eq('structure_id', profile.structure_id).order('numero'),
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

  function setField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function openNew() {
    setForm({ vendeurId: vendeurs[0]?.id || '', dojoId: '', sousCompId: '', scheduledDate: '', notes: '', objectif: '' })
    setModal('new')
  }

  function openDetail(s) {
    setDetailSession(s)
    setCommentaire(s.commentaire_manager || '')
    setModal('detail')
  }

  function patchDetail(updates) {
    const next = { ...detailSession, ...updates }
    setDetailSession(next)
    setSessions(prev => prev.map(s => s.id === next.id ? next : s))
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
      setSessions(prev => [enriched, ...prev].sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date)))
    }
    setSaving(false)
    setModal(null)
  }

  async function handleDojoRealise() {
    if (!detailSession || updating) return
    setUpdating(true)
    const now = new Date().toISOString()
    await supabase.from('coaching_sessions').update({ dojo_realise: true, dojo_realise_at: now }).eq('id', detailSession.id)
    patchDetail({ dojo_realise: true, dojo_realise_at: now })
    setUpdating(false)
  }

  async function handleObjectifAtteint() {
    if (!detailSession || updating) return
    setUpdating(true)
    const now = new Date().toISOString()
    await supabase.from('coaching_sessions').update({
      objectif_atteint: true, objectif_atteint_at: now,
      status: 'validated', validated_at: now,
    }).eq('id', detailSession.id)
    patchDetail({ objectif_atteint: true, objectif_atteint_at: now, status: 'validated', validated_at: now })
    setUpdating(false)
  }

  async function saveCommentaire() {
    if (!detailSession) return
    setSavingComment(true)
    await supabase.from('coaching_sessions').update({ commentaire_manager: commentaire }).eq('id', detailSession.id)
    patchDetail({ commentaire_manager: commentaire })
    setSavingComment(false)
  }

  const filtered = sessions.filter(s => {
    const st = sessionStatus(s)
    if (filter === 'planifiee') return st === 'planifiee'
    if (filter === 'en_cours') return st === 'en_cours'
    if (filter === 'terminee') return st === 'terminee'
    return true
  })

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      <div style={{ padding: '18px 24px 14px', background: '#fff', borderBottom: '1px solid var(--ln)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, boxShadow: '0 1px 4px rgba(7,40,32,.04)' }}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 600, color: 'var(--fi)' }}>Sessions de coaching</div>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 2 }}>Planifiez et suivez les 2 phases de chaque session</div>
        </div>
        <button onClick={openNew} style={btnPrimary}><IconPlus size={15} /> Programmer une session</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {[['all', 'Toutes'], ['planifiee', 'Planifiées'], ['en_cours', 'En cours'], ['terminee', 'Terminées']].map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)} style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
              cursor: 'pointer', border: 'none',
              background: filter === key ? 'var(--forest)' : 'var(--bg)',
              color: filter === key ? 'var(--fluo)' : 'var(--mu)',
            }}>
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
            const st = sessionStatus(s)
            const cfg = STATUS[st]
            return (
              <div
                key={s.id}
                onClick={() => openDetail(s)}
                style={{
                  background: '#fff', borderRadius: 12, boxShadow: 'var(--sh)',
                  padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14,
                  borderLeft: `3px solid ${cfg.border}`, cursor: 'pointer',
                  transition: 'box-shadow .15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(7,40,32,.1)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--sh)' }}
              >
                <div style={{ width: 44, textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1, color: cfg.color }}>
                    {new Date(s.scheduled_date + 'T00:00:00').getDate()}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--mu)', textTransform: 'uppercase' }}>
                    {new Date(s.scheduled_date + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'short' })}
                  </div>
                </div>

                <div style={{ width: 1, height: 36, background: 'var(--ln)', flexShrink: 0 }} />

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Avatar name={s.profiles?.full_name} id={s.vendeur_id} size={22} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fi)' }}>{s.profiles?.full_name}</span>
                    {s.profiles?.poste && <span style={{ fontSize: 11, color: 'var(--mu)' }}>· {s.profiles.poste}</span>}
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
                    {s.notes && <span style={{ fontSize: 11, color: 'var(--mu)', fontStyle: 'italic' }}>{s.notes}</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: cfg.bg, color: cfg.color }}>
                    {cfg.label}
                  </span>
                  <IconChevronRight size={15} color="var(--mu)" />
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
              <select value={form.vendeurId} onChange={e => setField('vendeurId', e.target.value)} style={inputStyle}>
                <option value="">Choisir un vendeur…</option>
                {vendeurs.map(v => <option key={v.id} value={v.id}>{v.full_name}</option>)}
              </select>
            </Field>
            <Field label="Date *">
              <input type="date" value={form.scheduledDate} onChange={e => setField('scheduledDate', e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Compétence ciblée">
              <select value={form.sousCompId} onChange={e => setField('sousCompId', e.target.value)} style={inputStyle}>
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
                <select value={form.dojoId} onChange={e => setField('dojoId', e.target.value)} style={inputStyle}>
                  <option value="">Aucun (optionnel)</option>
                  {dojos.map(d => <option key={d.id} value={d.id}>{d.titre}</option>)}
                </select>
              </Field>
            )}
            <Field label="Notes / Instructions">
              <textarea value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder="Ce que le vendeur doit travailler…" style={{ ...inputStyle, resize: 'none', height: 56 }} />
            </Field>
            <Field label="Objectif post-coaching">
              <textarea value={form.objectif} onChange={e => setField('objectif', e.target.value)} placeholder="Ex : Réaliser 3 découvertes complètes en RDV client" style={{ ...inputStyle, resize: 'none', height: 68 }} />
            </Field>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={() => setModal(null)} style={btnGhost}>Annuler</button>
              <button onClick={createSession} disabled={saving || !form.vendeurId || !form.scheduledDate} style={{ ...btnPrimary, opacity: (!form.vendeurId || !form.scheduledDate) ? 0.5 : 1 }}>
                <IconCalendarPlus size={14} /> {saving ? 'Création…' : 'Programmer'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal — Détail session */}
      {modal === 'detail' && detailSession && (
        <DetailModal
          session={detailSession}
          commentaire={commentaire}
          setCommentaire={setCommentaire}
          savingComment={savingComment}
          updating={updating}
          onDojoRealise={handleDojoRealise}
          onObjectifAtteint={handleObjectifAtteint}
          onSaveCommentaire={saveCommentaire}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

function DetailModal({ session: s, commentaire, setCommentaire, savingComment, updating, onDojoRealise, onObjectifAtteint, onSaveCommentaire, onClose }) {
  const st = sessionStatus(s)
  const cfg = STATUS[st]

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(7,40,32,.35)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 16, width: 500, boxShadow: '0 16px 48px rgba(7,40,32,.2)', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--ln)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <Avatar name={s.profiles?.full_name} id={s.vendeur_id} size={40} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fi)' }}>{s.profiles?.full_name}</div>
              <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 2 }}>Session du {formatDate(s.scheduled_date)}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: cfg.bg, color: cfg.color }}>
                {cfg.label}
              </span>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mu)', padding: 4, lineHeight: 1 }}>
                <IconX size={18} />
              </button>
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Infos */}
          {(s.sous_competences?.title || s.dojos?.titre || s.objectif || s.notes) && (
            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {s.sous_competences?.title && (
                <InfoRow label="Compétence" value={s.sous_competences.title} bold />
              )}
              {s.dojos?.titre && (
                <InfoRow label="Dojo" value={s.dojos.titre} bold />
              )}
              {s.objectif && (
                <InfoRow label="Objectif" value={s.objectif} />
              )}
              {s.notes && (
                <InfoRow label="Notes" value={s.notes} italic />
              )}
            </div>
          )}

          {/* Commentaire manager */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fi)', marginBottom: 6 }}>Commentaire manager</div>
            <textarea
              value={commentaire}
              onChange={e => setCommentaire(e.target.value)}
              placeholder="Feedback, observations, points d'amélioration…"
              style={{ ...inputStyle, resize: 'none', height: 80, display: 'block', marginBottom: 8 }}
            />
            <button onClick={onSaveCommentaire} disabled={savingComment} style={{ ...btnGhost, fontSize: 12, padding: '5px 12px' }}>
              {savingComment ? 'Sauvegarde…' : 'Sauvegarder'}
            </button>
          </div>

          {/* Phase 1 */}
          <PhaseBlock
            number={1}
            title="Réalisation du Dojo"
            subtitle="Offline — Travail du geste en dehors des conditions réelles"
            done={s.dojo_realise}
            doneLabel={`Dojo réalisé${s.dojo_realise_at ? ` — ${formatDate(s.dojo_realise_at)}` : ''}`}
            actionLabel="Valider le Dojo réalisé"
            onAction={onDojoRealise}
            loading={updating}
          />

          {/* Phase 2 — visible seulement après phase 1 */}
          {s.dojo_realise && (
            <PhaseBlock
              number={2}
              title="Mise en pratique"
              subtitle="Online — Application du geste en conditions réelles"
              done={s.objectif_atteint}
              doneLabel={`Objectif atteint${s.objectif_atteint_at ? ` — ${formatDate(s.objectif_atteint_at)}` : ''}`}
              actionLabel="Valider l'objectif atteint"
              onAction={onObjectifAtteint}
              loading={updating}
            />
          )}

        </div>
      </div>
    </div>
  )
}

function PhaseBlock({ number, title, subtitle, done, doneLabel, actionLabel, onAction, loading }) {
  return (
    <div style={{
      border: `1.5px solid ${done ? '#BBF7D0' : 'var(--ln)'}`,
      borderRadius: 10, padding: '14px 16px',
      background: done ? 'rgba(220,252,231,.2)' : '#fff',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700,
          background: done ? 'var(--forest)' : 'var(--bg)',
          color: done ? 'var(--fluo)' : 'var(--mu)',
          border: done ? 'none' : '1.5px solid var(--ln)',
        }}>
          {done ? <IconCheck size={11} /> : number}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: done ? '#166534' : 'var(--fi)' }}>
            Phase {number} — {title}
          </div>
          <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 1 }}>{subtitle}</div>
        </div>
      </div>
      {done ? (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#166534', marginLeft: 32 }}>
          <IconCheck size={13} /> {doneLabel}
        </div>
      ) : (
        <div style={{ marginLeft: 32 }}>
          <button onClick={onAction} disabled={loading} style={{ ...btnPrimary, fontSize: 12, padding: '7px 14px' }}>
            {loading ? '…' : actionLabel}
          </button>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value, bold, italic }) {
  return (
    <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
      <span style={{ color: 'var(--mu)', fontWeight: 500, minWidth: 90, flexShrink: 0 }}>{label}</span>
      <span style={{ color: 'var(--fi)', fontWeight: bold ? 600 : 400, fontStyle: italic ? 'italic' : 'normal' }}>{value}</span>
    </div>
  )
}

function Modal({ title, onClose, children }) {
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
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fi)' }}>{title}</div>
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
