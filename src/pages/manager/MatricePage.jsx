import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { IconChevronUp, IconChevronDown, IconPrinter, IconUsers, IconUser } from '@tabler/icons-react'

const SCORES = [
  { value: 0, label: 'Non évalué', short: '—', bg: '#F8D7DA', color: '#842029', bar: '#F87171' },
  { value: 1, label: 'En cours',   short: '1',  bg: '#FFF3CD', color: '#664D03', bar: '#FBBF24' },
  { value: 2, label: 'Acquis',     short: '2',  bg: '#D1ECF1', color: '#0C5460', bar: '#60A5FA' },
  { value: 3, label: 'Maîtrisé',   short: '3',  bg: '#D4EDDA', color: '#155724', bar: '#4ADE80' },
]

export default function MatricePage() {
  const { profile } = useAuth()
  const location = useLocation()

  const [view, setView]           = useState('eval')
  const [dashScope, setDashScope] = useState('vendeur')
  const [vendeurs, setVendeurs]   = useState([])
  const [selectedId, setSelectedId] = useState(location.state?.vendeurId || null)
  const [comps, setComps]         = useState([])
  const [evals, setEvals]         = useState({})
  const [teamScores, setTeamScores] = useState({})
  const [lastEvalDate, setLastEvalDate] = useState(null)
  const [openBlocks, setOpenBlocks] = useState({})
  const [loadingInit, setLoadingInit]     = useState(true)
  const [loadingVendeur, setLoadingVendeur] = useState(false)

  useEffect(() => { if (profile?.structure_id) init() }, [profile?.structure_id])
  useEffect(() => { if (selectedId) loadVendeur(selectedId) }, [selectedId])

  async function init() {
    const [{ data: v }, { data: c }, { data: sc }] = await Promise.all([
      supabase.from('profiles').select('id, full_name').eq('structure_id', profile.structure_id).eq('role', 'vendeur'),
      supabase.from('competences').select('*').eq('structure_id', profile.structure_id).order('numero'),
      supabase.from('sous_competences').select('*, competences(structure_id)'),
    ])
    setVendeurs(v || [])
    if (!selectedId && v?.length) setSelectedId(v[0].id)
    const compIds = (c || []).map(x => x.id)
    const enriched = (c || []).map(comp => ({
      ...comp,
      sous: (sc || [])
        .filter(s => s.competence_id === comp.id && compIds.includes(s.competence_id))
        .sort((a, b) => a.order_index - b.order_index),
    }))
    setComps(enriched)
    const opens = {}
    enriched.forEach(comp => { opens[comp.id] = true })
    setOpenBlocks(opens)
    setLoadingInit(false)
  }

  async function loadVendeur(id) {
    setLoadingVendeur(true)
    const { data } = await supabase.from('evaluations').select('*').eq('vendeur_id', id)
    const map = {}
    let maxDate = null
    data?.forEach(e => {
      map[e.sous_competence_id] = { score: Math.min(3, e.score || 0), is_priority: e.is_priority || false }
      if (e.evaluated_at && (!maxDate || new Date(e.evaluated_at) > new Date(maxDate))) maxDate = e.evaluated_at
    })
    setEvals(map)
    setLastEvalDate(maxDate)
    setLoadingVendeur(false)
  }

  async function loadTeam() {
    const ids = vendeurs.map(v => v.id)
    if (!ids.length) return
    const { data } = await supabase.from('evaluations').select('vendeur_id, sous_competence_id, score').in('vendeur_id', ids)
    const map = {}
    ids.forEach(id => { map[id] = {} })
    data?.forEach(e => { if (map[e.vendeur_id]) map[e.vendeur_id][e.sous_competence_id] = Math.min(3, e.score || 0) })
    setTeamScores(map)
  }

  async function handleScore(scId, score) {
    const cur = evals[scId] || { score: 0, is_priority: false }
    const newScore = cur.score === score ? 0 : score
    setEvals(prev => ({ ...prev, [scId]: { ...cur, score: newScore } }))
    await supabase.from('evaluations').upsert({
      vendeur_id: selectedId, sous_competence_id: scId, score: newScore,
      is_priority: cur.is_priority, evaluated_by: profile.id, evaluated_at: new Date().toISOString(),
    }, { onConflict: 'vendeur_id,sous_competence_id' })
  }

  async function handlePriority(scId) {
    const cur = evals[scId] || { score: 0, is_priority: false }
    const isPriority = !cur.is_priority
    setEvals(prev => ({ ...prev, [scId]: { ...cur, is_priority: isPriority } }))
    await supabase.from('evaluations').upsert({
      vendeur_id: selectedId, sous_competence_id: scId, score: cur.score,
      is_priority: isPriority, evaluated_by: profile.id, evaluated_at: new Date().toISOString(),
    }, { onConflict: 'vendeur_id,sous_competence_id' })
  }

  function compStats(comp) {
    const scores = comp.sous.map(sc => evals[sc.id]?.score || 0)
    const valid = scores.filter(s => s > 0)
    const avg = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0
    return { avg, pct: Math.round((avg / 3) * 100), count: valid.length, total: comp.sous.length }
  }

  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const evalExpired = !lastEvalDate || new Date(lastEvalDate) < threeMonthsAgo

  const priorities = comps.flatMap(c =>
    c.sous.filter(sc => evals[sc.id]?.is_priority).map(sc => ({ ...sc, compTitle: c.title }))
  )

  // ── Print helpers ──────────────────────────────────────────────────────────

  function printIndividuel() {
    const vendeur = vendeurs.find(v => v.id === selectedId)
    const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    const rows = comps.map(comp => {
      const { avg } = compStats(comp)
      return `<div style="margin-bottom:20px;page-break-inside:avoid">
        <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#0B3D2E;border-radius:6px;margin-bottom:8px">
          <div style="width:22px;height:22px;background:#D4FF3A;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#0B3D2E;flex-shrink:0">${String(comp.numero).padStart(2, '0')}</div>
          <span style="font-weight:600;color:#fff;flex:1;font-size:13px">${comp.title}</span>
          <span style="font-size:12px;font-weight:700;color:#D4FF3A">Moy: ${avg > 0 ? avg.toFixed(1) : '—'}/3</span>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:#f5f5f5">
            <th style="padding:6px 10px;text-align:left;font-weight:600;color:#555">Sous-compétence</th>
            <th style="padding:6px 10px;text-align:center;font-weight:600;color:#555;width:150px">Niveau</th>
            <th style="padding:6px 10px;text-align:center;font-weight:600;color:#555;width:70px">Priorité</th>
          </tr></thead>
          <tbody>
            ${comp.sous.map((sc, i) => {
              const ev = evals[sc.id] || { score: 0, is_priority: false }
              const lvl = SCORES[ev.score] || SCORES[0]
              return `<tr style="border-bottom:1px solid #eee;background:${i % 2 === 0 ? '#fff' : '#fafafa'}">
                <td style="padding:6px 10px;color:#333">${sc.title}</td>
                <td style="padding:6px 10px;text-align:center"><span style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:${lvl.bg};color:${lvl.color}">${ev.score === 0 ? '—' : ev.score} ${lvl.label}</span></td>
                <td style="padding:6px 10px;text-align:center;color:${ev.is_priority ? '#F59E0B' : '#ccc'};font-size:16px">${ev.is_priority ? '★' : '☆'}</td>
              </tr>`
            }).join('')}
          </tbody>
        </table>
      </div>`
    }).join('')

    openPrint(`
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:12px;border-bottom:2px solid #0B3D2E">
        <div><div style="font-size:18px;font-weight:700;color:#0B3D2E">PREMIÈRE LIGNE</div><div style="font-size:11px;font-style:italic;color:#666">On forme là où ça se joue</div></div>
        <div style="text-align:right"><div style="font-size:13px;font-weight:600;color:#0B3D2E">Fiche individuelle — ${vendeur?.full_name || ''}</div><div style="font-size:11px;color:#666">Générée le ${today}</div></div>
      </div>${rows}`, false)
  }

  async function printEquipe() {
    await loadTeam()
    const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    const cols = vendeurs.slice(0, 8)
    const rows = comps.map(comp => {
      const teamAvg = (() => {
        const scores = comp.sous.flatMap(sc => cols.map(v => teamScores[v.id]?.[sc.id] || 0)).filter(s => s > 0)
        return scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—'
      })()
      return `<div style="margin-bottom:16px;page-break-inside:avoid">
        <div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:#0B3D2E;border-radius:5px;margin-bottom:6px">
          <div style="width:20px;height:20px;background:#D4FF3A;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#0B3D2E">${String(comp.numero).padStart(2, '0')}</div>
          <span style="font-weight:600;color:#fff;flex:1;font-size:12px">${comp.title}</span>
          <span style="font-size:10px;font-weight:700;color:#D4FF3A">Moy équipe: ${teamAvg}/3</span>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:10px">
          <thead><tr style="background:#f5f5f5">
            <th style="padding:5px 8px;text-align:left;font-weight:600;color:#555">Sous-compétence</th>
            ${cols.map(v => `<th style="padding:5px 8px;text-align:center;font-weight:600;color:#555;width:60px">${v.full_name?.split(' ')[0] || ''}</th>`).join('')}
          </tr></thead>
          <tbody>
            ${comp.sous.map((sc, i) => `<tr style="border-bottom:1px solid #eee;background:${i % 2 === 0 ? '#fff' : '#fafafa'}">
              <td style="padding:5px 8px;color:#333">${sc.title}</td>
              ${cols.map(v => { const s = teamScores[v.id]?.[sc.id] || 0; const lvl = SCORES[s] || SCORES[0]; return `<td style="padding:5px 8px;text-align:center;background:${s > 0 ? lvl.bg : 'transparent'};color:${s > 0 ? lvl.color : '#ccc'};font-weight:700">${s === 0 ? '—' : s}</td>` }).join('')}
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`
    }).join('')

    openPrint(`
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #0B3D2E">
        <div><div style="font-size:16px;font-weight:700;color:#0B3D2E">PREMIÈRE LIGNE</div><div style="font-size:10px;font-style:italic;color:#666">On forme là où ça se joue</div></div>
        <div style="text-align:right"><div style="font-size:12px;font-weight:600;color:#0B3D2E">Fiche équipe — ${vendeurs.length} vendeurs</div><div style="font-size:10px;color:#666">Générée le ${today}</div></div>
      </div>${rows}`, true)
  }

  function openPrint(content, landscape) {
    const win = window.open('', '_blank', 'width=960,height=700')
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:28px;color:#333}
      @media print{body{padding:12px}@page{margin:1cm${landscape ? ';size:A4 landscape' : ''}}}
    </style></head><body>${content}</body></html>`)
    win.document.close()
    setTimeout(() => { win.focus(); win.print() }, 400)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loadingInit) {
    return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: 'var(--mu)' }}>Chargement…</div></div>
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{ padding: '14px 24px', background: '#fff', borderBottom: '1px solid var(--ln)', flexShrink: 0, boxShadow: '0 1px 4px rgba(7,40,32,.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 600, color: 'var(--fi)' }}>Matrice & Évaluations</div>
            <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
              {selectedId
                ? (lastEvalDate
                  ? `Dernière éval : ${new Date(lastEvalDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
                  : 'Jamais évalué')
                : 'Sélectionnez un vendeur'}
              {selectedId && evalExpired && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: '#FEE2E2', color: '#991B1B' }}>À renouveler</span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* View toggle */}
            <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: 9, padding: 3, gap: 2 }}>
              {[['eval', 'Évaluation'], ['dash', 'Dashboard']].map(([tab, label]) => (
                <button key={tab} onClick={() => { setView(tab); if (tab === 'dash') loadTeam() }}
                  style={{ padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none', transition: 'all .15s', background: view === tab ? 'var(--forest)' : 'transparent', color: view === tab ? 'var(--fluo)' : 'var(--mu)' }}>
                  {label}
                </button>
              ))}
            </div>
            <button onClick={printIndividuel} style={btnGhost}><IconPrinter size={14} /> Fiche individuelle</button>
            <button onClick={printEquipe} style={btnGhost}><IconPrinter size={14} /> Fiche équipe</button>
          </div>
        </div>

        {/* ── Vendeur tabs ── */}
        {vendeurs.length > 0 ? (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {vendeurs.map(v => {
              const isActive = v.id === selectedId
              return (
                <button key={v.id} onClick={() => setSelectedId(v.id)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none', transition: 'all .15s', background: isActive ? 'var(--forest)' : 'var(--bg)', color: isActive ? 'var(--fluo)' : 'var(--fi)', boxShadow: isActive ? '0 2px 6px rgba(11,61,46,.2)' : 'none' }}>
                  {v.full_name}
                  {isActive && evalExpired && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#DC2626', flexShrink: 0 }} />}
                </button>
              )
            })}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--mu)' }}>Aucun vendeur dans cette structure.</div>
        )}
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>

        {/* ── Evaluation view ── */}
        {view === 'eval' && (
          <>
            {/* Légende */}
            <div style={{ background: '#fff', borderRadius: 10, padding: '10px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', boxShadow: 'var(--sh)' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fi)' }}>Niveaux :</span>
              {SCORES.map(s => (
                <span key={s.value} style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>
                  {s.short} {s.label}
                </span>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--mu)' }}>★ = Axe prioritaire</span>
            </div>

            {loadingVendeur && <div style={{ textAlign: 'center', padding: 40, color: 'var(--mu)' }}>Chargement…</div>}

            {!loadingVendeur && comps.map(comp => {
              const { avg, pct, count, total } = compStats(comp)
              const isOpen = openBlocks[comp.id] !== false
              return (
                <div key={comp.id} style={{ background: '#fff', borderRadius: 14, boxShadow: 'var(--sh)', overflow: 'hidden', marginBottom: 10 }}>

                  {/* Accordion header */}
                  <div
                    onClick={() => setOpenBlocks(p => ({ ...p, [comp.id]: !p[comp.id] }))}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', background: 'var(--forest)', userSelect: 'none' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.93'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--fluo)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--forest)', flexShrink: 0 }}>
                      {String(comp.numero).padStart(2, '0')}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{comp.title}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', marginTop: 1 }}>{count}/{total} évaluées</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 100, height: 6, background: 'rgba(255,255,255,.2)', borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 10, background: '#D4FF3A', transition: 'width .3s' }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.9)', minWidth: 38 }}>
                        {avg > 0 ? `${avg.toFixed(1)}/3` : '—'}
                      </span>
                    </div>
                    {isOpen ? <IconChevronUp size={15} color="rgba(255,255,255,.6)" /> : <IconChevronDown size={15} color="rgba(255,255,255,.6)" />}
                  </div>

                  {/* Sous-compétences */}
                  {isOpen && (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px 100px', padding: '6px 16px 4px', fontSize: 10, fontWeight: 600, color: 'var(--mu)', letterSpacing: '.5px', textTransform: 'uppercase', background: 'var(--bg)', borderBottom: '1px solid var(--ln)', gap: 10 }}>
                        <span>Sous-compétence</span><span>Niveau</span><span>Action</span>
                      </div>
                      {comp.sous.map((sc, idx) => {
                        const ev = evals[sc.id] || { score: 0, is_priority: false }
                        return (
                          <div key={sc.id}
                            style={{ display: 'grid', gridTemplateColumns: '1fr 150px 100px', alignItems: 'center', padding: '9px 16px', gap: 10, borderBottom: idx < comp.sous.length - 1 ? '1px solid var(--ln)' : 'none', transition: 'background .1s' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            {/* Label */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              {ev.is_priority && <span style={{ fontSize: 13, color: '#F59E0B', flexShrink: 0 }}>★</span>}
                              <span style={{ fontSize: 13, color: 'var(--fi)', fontWeight: ev.is_priority ? 600 : 400 }}>{sc.title}</span>
                            </div>

                            {/* Score buttons */}
                            <div style={{ display: 'flex', gap: 4 }}>
                              {SCORES.map(lvl => {
                                const active = ev.score === lvl.value
                                return (
                                  <button key={lvl.value} onClick={() => handleScore(sc.id, lvl.value)} title={lvl.label}
                                    style={{ width: 32, height: 32, borderRadius: 7, cursor: 'pointer', border: active ? `2px solid ${lvl.color}` : '2px solid transparent', background: active ? lvl.bg : 'var(--bg)', color: active ? lvl.color : '#bbb', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .1s' }}>
                                    {lvl.short}
                                  </button>
                                )
                              })}
                            </div>

                            {/* Priority toggle */}
                            <button onClick={() => handlePriority(sc.id)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 9px', borderRadius: 7, fontSize: 11, fontWeight: 500, cursor: 'pointer', transition: 'all .15s', border: ev.is_priority ? '1px solid #F59E0B' : '1px solid var(--ln)', background: ev.is_priority ? '#FEF9C3' : '#fff', color: ev.is_priority ? '#92400E' : 'var(--mu)' }}>
                              {ev.is_priority ? '★' : '☆'} Priorité
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}

        {/* ── Dashboard view ── */}
        {view === 'dash' && (
          <DashView
            comps={comps} evals={evals} teamScores={teamScores}
            vendeurs={vendeurs} scope={dashScope}
            onScopeChange={s => { setDashScope(s); if (s === 'equipe') loadTeam() }}
            priorities={priorities}
          />
        )}
      </div>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function DashView({ comps, evals, teamScores, vendeurs, scope, onScopeChange, priorities }) {
  function compAvg(comp) {
    if (scope === 'equipe') {
      const scores = comp.sous.flatMap(sc => Object.values(teamScores).map(v => v[sc.id] || 0)).filter(s => s > 0)
      return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
    }
    const scores = comp.sous.map(sc => evals[sc.id]?.score || 0).filter(s => s > 0)
    return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
        <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: 9, padding: 3, gap: 2 }}>
          {[['vendeur', IconUser, 'Ce vendeur'], ['equipe', IconUsers, "Toute l'équipe"]].map(([s, Icon, label]) => (
            <button key={s} onClick={() => onScopeChange(s)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none', background: scope === s ? 'var(--forest)' : 'transparent', color: scope === s ? 'var(--fluo)' : 'var(--mu)' }}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
        {scope === 'equipe' && <span style={{ fontSize: 12, color: 'var(--mu)' }}>{vendeurs.length} vendeurs</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: scope === 'vendeur' ? '1fr 280px' : '1fr', gap: 16 }}>
        {/* Barres */}
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: 'var(--sh)', padding: '18px 20px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fi)', marginBottom: 16 }}>Score moyen par compétence</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {comps.map(comp => {
              const avg = compAvg(comp)
              const pct = Math.round((avg / 3) * 100)
              const lvl = SCORES[Math.min(3, Math.round(avg))] || SCORES[0]
              return (
                <div key={comp.id}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 20, height: 20, borderRadius: 5, background: 'var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--fluo)' }}>
                        {String(comp.numero).padStart(2, '0')}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fi)' }}>{comp.title}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: avg > 0 ? lvl.color : 'var(--mu)', background: avg > 0 ? lvl.bg : 'transparent', padding: '2px 7px', borderRadius: 5 }}>
                      {avg > 0 ? `${avg.toFixed(1)}/3` : '—'}
                    </span>
                  </div>
                  <div style={{ height: 10, background: 'var(--ln)', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: lvl.bar, borderRadius: 10, transition: 'width .4s' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Priorités (vendeur uniquement) */}
        {scope === 'vendeur' && (
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: 'var(--sh)', padding: '18px 20px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fi)', marginBottom: 14 }}>
              ★ Axes prioritaires <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--mu)' }}>({priorities.length})</span>
            </div>
            {priorities.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--mu)', fontStyle: 'italic', lineHeight: 1.5 }}>
                Aucun axe défini. Marquez des sous-compétences comme prioritaires dans la vue Évaluation.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {priorities.map(sc => {
                  const ev = evals[sc.id] || { score: 0 }
                  const lvl = SCORES[ev.score] || SCORES[0]
                  return (
                    <div key={sc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 11px', borderRadius: 9, background: '#FEF9C3', border: '1px solid #FDE68A' }}>
                      <span style={{ fontSize: 14, color: '#F59E0B', flexShrink: 0 }}>★</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#92400E' }}>{sc.title}</div>
                        <div style={{ fontSize: 10, color: '#A16207' }}>{sc.compTitle}</div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: lvl.bg, color: lvl.color }}>
                        {ev.score === 0 ? '—' : ev.score}/3
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const btnGhost = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
  cursor: 'pointer', border: '1px solid var(--ln)', background: '#fff', color: 'var(--fi)',
}
