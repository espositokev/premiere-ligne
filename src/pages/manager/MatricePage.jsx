import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { SCORE_LABELS, SCORE_STYLES } from '../../lib/utils'
import { checkAndAwardBadges, rewardDojoValidation } from '../../lib/badges'
import {
  IconDeviceFloppy, IconChevronUp, IconChevronDown, IconUsers,
  IconCheck, IconBook2, IconCalendarPlus, IconPlus, IconX,
} from '@tabler/icons-react'

export default function MatricePage() {
  const { profile } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [vendeurs, setVendeurs] = useState([])
  const [selectedId, setSelectedId] = useState(location.state?.vendeurId || '')
  const [competences, setCompetences] = useState([])
  const [openBlocks, setOpenBlocks] = useState({})
  const [evaluations, setEvaluations] = useState({})
  const [dojos, setDojos] = useState([])
  const [vendeurDojos, setVendeurDojos] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState(null) // { sousCompId, dojoId, dojoTitle, vendeurName }
  const [modalDate, setModalDate] = useState('')
  const [modalNotes, setModalNotes] = useState('')

  useEffect(() => { if (profile?.structure_id) loadStructure() }, [profile?.structure_id])
  useEffect(() => { if (selectedId) loadVendeurData() }, [selectedId])

  async function loadStructure() {
    const [{ data: v }, { data: c }, { data: sc }, { data: d }] = await Promise.all([
      supabase.from('profiles').select('id, full_name').eq('structure_id', profile.structure_id).eq('role', 'vendeur'),
      supabase.from('competences').select('*').eq('structure_id', profile.structure_id).order('numero'),
      supabase.from('sous_competences').select('*, competences(structure_id)'),
      supabase.from('dojos').select('*').eq('structure_id', profile.structure_id),
    ])
    setVendeurs(v || [])
    if (!selectedId && v?.length) setSelectedId(v[0].id)

    // Filter sous_competences to structure
    const compIds = (c || []).map(x => x.id)
    const filtered = (sc || []).filter(s => compIds.includes(s.competence_id))

    const enriched = (c || []).map(comp => ({
      ...comp,
      sous: filtered.filter(s => s.competence_id === comp.id).sort((a, b) => a.order_index - b.order_index),
    }))
    setCompetences(enriched)
    setDojos(d || [])
    // Open all blocks by default
    const opens = {}
    enriched.forEach(c => { opens[c.id] = true })
    setOpenBlocks(opens)
    setLoading(false)
  }

  async function loadVendeurData() {
    if (!selectedId) return
    const [{ data: evals }, { data: vd }] = await Promise.all([
      supabase.from('evaluations').select('*').eq('vendeur_id', selectedId),
      supabase.from('vendeur_dojos').select('*, dojos(title, competence_id)').eq('vendeur_id', selectedId),
    ])
    const evalMap = {}
    evals?.forEach(e => { evalMap[e.sous_competence_id] = e.score })
    setEvaluations(evalMap)
    setVendeurDojos(vd || [])
  }

  async function setScore(sousId, score) {
    const newEvals = { ...evaluations, [sousId]: score }
    setEvaluations(newEvals)
  }

  async function saveAll() {
    if (!selectedId) return
    setSaving(true)
    const upserts = Object.entries(evaluations).map(([sous_competence_id, score]) => ({
      vendeur_id: selectedId, sous_competence_id, score,
      evaluated_by: profile.id, evaluated_at: new Date().toISOString(),
    }))
    if (upserts.length) {
      await supabase.from('evaluations').upsert(upserts, { onConflict: 'vendeur_id,sous_competence_id' })
    }
    setSaving(false)
  }

  async function toggleDojo(dojo) {
    const existing = vendeurDojos.find(vd => vd.dojo_id === dojo.id)

    if (!existing) {
      // Pas assigné → assigner
      const { data } = await supabase.from('vendeur_dojos').insert({
        vendeur_id: selectedId, dojo_id: dojo.id,
        assigned_by: profile.id, status: 'assigned',
      }).select('*, dojos(title, competence_id)').single()
      if (data) setVendeurDojos(prev => [...prev, data])
    } else if (existing.status === 'assigned') {
      // Assigné → valider (manager confirme la maîtrise)
      const { data } = await supabase.from('vendeur_dojos')
        .update({ status: 'validated', validated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select('*, dojos(title, competence_id)').single()
      if (data) setVendeurDojos(prev => prev.map(vd => vd.id === existing.id ? data : vd))
      // Récompenses XP + badges automatiques
      await rewardDojoValidation(selectedId)
      await checkAndAwardBadges(selectedId, profile.structure_id)
    } else if (existing.status === 'validated') {
      // Validé → retirer (correction possible)
      await supabase.from('vendeur_dojos').delete().eq('id', existing.id)
      setVendeurDojos(prev => prev.filter(vd => vd.id !== existing.id))
    }
  }

  async function planifierDojo() {
    if (!modal || !selectedId) return
    // Find or create active plan
    let { data: plan } = await supabase.from('plans')
      .select('id').eq('vendeur_id', selectedId).eq('status', 'active').single()

    if (!plan) {
      const vendeur = vendeurs.find(v => v.id === selectedId)
      const { data: newPlan } = await supabase.from('plans').insert({
        vendeur_id: selectedId, manager_id: profile.id,
        title: `Plan ${vendeur?.full_name}`, status: 'active',
      }).select().single()
      plan = newPlan
    }
    if (!plan) return

    // Add dojo to plan
    await supabase.from('plan_dojos').upsert({
      plan_id: plan.id, dojo_id: modal.dojoId,
      target_date: modalDate || null, status: 'todo',
    }, { onConflict: 'plan_id,dojo_id' })

    // Also assign the dojo
    const existing = vendeurDojos.find(vd => vd.dojo_id === modal.dojoId)
    if (!existing) {
      const { data } = await supabase.from('vendeur_dojos').insert({
        vendeur_id: selectedId, dojo_id: modal.dojoId,
        assigned_by: profile.id, status: 'assigned',
      }).select('*, dojos(title, competence_id)').single()
      if (data) setVendeurDojos(prev => [...prev, data])
    }

    setModal(null)
    setModalDate('')
    setModalNotes('')
  }

  const selectedVendeur = vendeurs.find(v => v.id === selectedId)

  if (!loading && competences.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <PageHeader profile={profile} vendeurs={vendeurs} selectedId={selectedId} setSelectedId={setSelectedId} saving={saving} saveAll={saveAll} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <div style={{ textAlign: 'center', maxWidth: 360 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fi)', marginBottom: 8 }}>
              Aucune compétence définie
            </div>
            <div style={{ fontSize: 13, color: 'var(--mu)', marginBottom: 24, lineHeight: 1.6 }}>
              Initialisez les 12 compétences automobiles depuis les Paramètres pour commencer à évaluer votre équipe.
            </div>
            <button onClick={() => navigate('/parametres')} style={btnPrimary}>
              Initialiser les compétences
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <PageHeader profile={profile} vendeurs={vendeurs} selectedId={selectedId} setSelectedId={setSelectedId} saving={saving} saveAll={saveAll} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {/* Légende */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', boxShadow: 'var(--sh)' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fi)' }}>Évaluation :</span>
          {SCORE_LABELS.slice(1).map((lbl, i) => (
            <span key={lbl} style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: SCORE_STYLES[i + 1].bg, color: SCORE_STYLES[i + 1].color }}>
              {'★'.repeat(i + 1)} {lbl}
            </span>
          ))}
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--mu)' }}>Chargement…</div>}

        {!loading && competences.map(comp => {
          const isOpen = openBlocks[comp.id]
          const scoredSous = comp.sous.filter(s => evaluations[s.id] > 0)
          const totalSous = comp.sous.length
          const pct = totalSous ? Math.round((scoredSous.length / totalSous) * 100) : 0
          const avgScore = scoredSous.length
            ? scoredSous.reduce((s, sub) => s + (evaluations[sub.id] || 0), 0) / scoredSous.length
            : 0

          const statusLabel = avgScore >= 4 ? 'Maîtrisé' : avgScore >= 3 ? 'Acquis' : avgScore >= 1 ? 'En cours' : 'Non démarré'
          const statusStyle = avgScore >= 4 ? { bg: '#DCFCE7', color: '#166534' } : avgScore >= 3 ? { bg: '#DBEAFE', color: '#1E40AF' } : avgScore >= 1 ? { bg: '#FEF9C3', color: '#854D0E' } : { bg: 'var(--bg)', color: 'var(--mu)' }

          return (
            <div key={comp.id} style={{ background: '#fff', borderRadius: 14, boxShadow: 'var(--sh)', overflow: 'hidden', marginBottom: 10 }}>
              {/* Header */}
              <div
                onClick={() => setOpenBlocks(prev => ({ ...prev, [comp.id]: !prev[comp.id] }))}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', cursor: 'pointer', borderBottom: isOpen ? '1px solid var(--ln)' : '1px solid transparent', transition: 'background .15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--fluo)' }}>
                    {String(comp.numero).padStart(2, '0')}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fi)' }}>{comp.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 1 }}>{totalSous} sous-compétences</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 80, height: 5, background: 'var(--ln)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 10, background: 'linear-gradient(90deg,var(--forest),var(--fl))' }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fi)', minWidth: 30, textAlign: 'right' }}>
                      {scoredSous.length}/{totalSous}
                    </span>
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: statusStyle.bg, color: statusStyle.color }}>
                    {statusLabel}
                  </span>
                  {isOpen ? <IconChevronUp size={14} color="var(--mu)" /> : <IconChevronDown size={14} color="var(--mu)" />}
                </div>
              </div>

              {/* Body */}
              {isOpen && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 110px 75px 1fr 130px', padding: '8px 16px 6px', fontSize: 10, fontWeight: 600, color: 'var(--mu)', letterSpacing: '.4px', textTransform: 'uppercase', background: 'var(--bg)', borderBottom: '1px solid var(--ln)', gap: 10 }}>
                    <span>Sous-compétence</span><span>Évaluation</span><span>Score</span><span>Dojos associés</span><span>Action</span>
                  </div>
                  {comp.sous.map((sc, idx) => {
                    const score = evaluations[sc.id] || 0
                    const scoreSt = SCORE_STYLES[score]
                    const relatedDojos = dojos.filter(d => d.competence_id === comp.id)

                    return (
                      <div key={sc.id} style={{ display: 'grid', gridTemplateColumns: '2fr 110px 75px 1fr 130px', alignItems: 'center', padding: '10px 16px', borderBottom: idx < comp.sous.length - 1 ? '1px solid var(--ln)' : 'none', gap: 10, transition: 'background .12s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div style={{ fontSize: 13, color: 'var(--fi)', fontWeight: 500 }}>{sc.title}</div>
                        {/* Stars */}
                        <div style={{ display: 'flex', gap: 3 }}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <span
                              key={star}
                              onClick={() => setScore(sc.id, star === score ? 0 : star)}
                              style={{ fontSize: 17, cursor: 'pointer', color: star <= score ? '#F59E0B' : 'var(--ln)', lineHeight: 1, transition: 'color .1s' }}
                            >★</span>
                          ))}
                        </div>
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 7, fontSize: 11, fontWeight: 600, background: scoreSt.bg, color: scoreSt.color }}>
                          {SCORE_LABELS[score]}
                        </span>
                        {/* Dojo chips */}
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          {relatedDojos.map(dojo => {
                            const vd = vendeurDojos.find(vd => vd.dojo_id === dojo.id)
                            const isValidated = vd?.status === 'validated'
                            const isAssigned = vd?.status === 'assigned'
                            return (
                              <span
                                key={dojo.id}
                                onClick={() => toggleDojo(dojo)}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 5,
                                  padding: '4px 9px', borderRadius: 8, fontSize: 11, fontWeight: 500,
                                  cursor: isValidated ? 'default' : 'pointer',
                                  border: isValidated ? '1px solid #86EFAC' : isAssigned ? '1px solid var(--forest)' : '1px solid var(--ln)',
                                  background: isValidated ? '#DCFCE7' : isAssigned ? 'var(--forest)' : '#fff',
                                  color: isValidated ? '#166534' : isAssigned ? 'var(--fluo)' : 'var(--fi)',
                                  whiteSpace: 'nowrap', transition: 'all .15s',
                                }}
                              >
                                {isValidated ? <IconCheck size={13} /> : <IconBook2 size={13} />}
                                {dojo.title}
                              </span>
                            )
                          })}
                        </div>
                        {/* Action */}
                        <div>
                          {score < 3 && relatedDojos.length > 0 && selectedId && (
                            vendeurDojos.some(vd => relatedDojos.find(d => d.id === vd.dojo_id) && vd.status === 'assigned')
                              ? (
                                <button
                                  onClick={() => {
                                    const dojo = relatedDojos[0]
                                    setModal({ dojoId: dojo.id, dojoTitle: dojo.title, vendeurName: selectedVendeur?.full_name })
                                    setModalDate('')
                                  }}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'var(--forest)', color: 'var(--fluo)', whiteSpace: 'nowrap' }}>
                                  <IconCalendarPlus size={13} />Planifier
                                </button>
                              ) : (
                                <button
                                  onClick={() => toggleDojo(relatedDojos[0])}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'var(--bg)', color: 'var(--mu)', border: '1px solid var(--ln)', whiteSpace: 'nowrap' }}>
                                  <IconPlus size={13} />Assigner
                                </button>
                              )
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal Planifier */}
      {modal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(7,40,32,.35)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}
          onClick={() => setModal(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: 420, boxShadow: '0 16px 48px rgba(7,40,32,.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fi)' }}>Planifier un Dojo</div>
                <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 3 }}>{modal.vendeurName} — {modal.dojoTitle}</div>
              </div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--mu)', padding: 2 }}><IconX size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fi)', marginBottom: 6 }}>Date du Dojo</div>
                <input type="date" value={modalDate} onChange={e => setModalDate(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid var(--ln)', fontSize: 13, background: 'var(--bg)', fontFamily: 'inherit' }} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fi)', marginBottom: 6 }}>Notes (objectif du Dojo)</div>
                <textarea value={modalNotes} onChange={e => setModalNotes(e.target.value)}
                  placeholder="Ce que le vendeur doit changer après ce Dojo…"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid var(--ln)', fontSize: 13, resize: 'none', height: 72, background: 'var(--bg)', fontFamily: 'inherit' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setModal(null)} style={{ padding: '9px 16px', borderRadius: 9, border: '1px solid var(--ln)', background: '#fff', fontSize: 13, cursor: 'pointer' }}>Annuler</button>
              <button onClick={planifierDojo} style={{ padding: '9px 16px', borderRadius: 9, border: 'none', background: 'var(--forest)', color: 'var(--fluo)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <IconCalendarPlus size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />Planifier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PageHeader({ profile, vendeurs, selectedId, setSelectedId, saving, saveAll }) {
  return (
    <div style={{ padding: '18px 24px 14px', background: '#fff', borderBottom: '1px solid var(--ln)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, boxShadow: '0 1px 4px rgba(7,40,32,.04)' }}>
      <div>
        <div style={{ fontSize: 19, fontWeight: 600, color: 'var(--fi)' }}>Matrice & Dojos</div>
        <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 2 }}>Évaluation + Dojos par sous-compétence</div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {vendeurs.length > 0 && (
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
            style={{ fontSize: 12, padding: '7px 11px', borderRadius: 9, border: '1px solid var(--ln)', background: '#fff' }}>
            {vendeurs.map(v => <option key={v.id} value={v.id}>{v.full_name}</option>)}
          </select>
        )}
        <button style={{ background: '#fff', color: 'var(--fi)', border: '1px solid var(--ln)', padding: '8px 14px', borderRadius: 9, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <IconUsers size={15} />Toute l'équipe
        </button>
        <button onClick={saveAll} disabled={saving} style={{ background: saving ? 'var(--mu)' : 'var(--forest)', color: 'var(--fluo)', border: 'none', padding: '8px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <IconDeviceFloppy size={15} />{saving ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  )
}

const btnPrimary = {
  background: 'var(--forest)', color: 'var(--fluo)', border: 'none',
  padding: '10px 20px', borderRadius: 9, fontSize: 13, fontWeight: 600,
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
}
