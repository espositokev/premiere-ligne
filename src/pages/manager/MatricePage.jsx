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
  const [structureName, setStructureName] = useState('')
  const [openBlocks, setOpenBlocks] = useState({})
  const [loadingInit, setLoadingInit]     = useState(true)
  const [loadingVendeur, setLoadingVendeur] = useState(false)

  useEffect(() => { if (profile?.structure_id) init() }, [profile?.structure_id])
  useEffect(() => { if (selectedId) loadVendeur(selectedId) }, [selectedId])

  async function init() {
    const [{ data: v }, { data: c }, { data: sc }, { data: struct }] = await Promise.all([
      supabase.from('profiles').select('id, full_name').eq('structure_id', profile.structure_id).eq('role', 'vendeur'),
      supabase.from('competences').select('*').eq('structure_id', profile.structure_id).order('numero'),
      supabase.from('sous_competences').select('*, competences(structure_id)'),
      supabase.from('structures').select('name').eq('id', profile.structure_id).single(),
    ])
    setVendeurs(v || [])
    setStructureName(struct?.name || '')
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
    return map
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

  function levelOf(avg) {
    if (avg >= 2.5) return SCORES[3]
    if (avg >= 1.5) return SCORES[2]
    if (avg > 0)   return SCORES[1]
    return SCORES[0]
  }

  function printIndividuel() {
    const vendeur = vendeurs.find(v => v.id === selectedId)
    if (!vendeur) return
    const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

    const renderComp = comp => {
      const validScores = comp.sous.map(sc => evals[sc.id]?.score || 0).filter(s => s > 0)
      const avg = validScores.length ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0
      const pct = Math.round((avg / 3) * 100)
      const lvl = levelOf(avg)

      const scRows = comp.sous.map(sc => {
        const ev = evals[sc.id] || { score: 0, is_priority: false }
        const slvl = SCORES[ev.score] || SCORES[0]
        return `<div class="sc-row">
          <div class="sc-name">${ev.is_priority ? '<span style="color:#F59E0B;margin-right:4px">★</span>' : ''}${sc.title}</div>
          <span class="sc-badge" style="background:${slvl.bg};color:${slvl.color}">${ev.score === 0 ? '— Non évalué' : `${ev.score} — ${slvl.label}`}</span>
        </div>`
      }).join('')

      return `<div class="comp-block">
        <div class="comp-hdr">
          <div class="cbadge">${String(comp.numero).padStart(2, '0')}</div>
          <div class="comp-name">${comp.title}</div>
          ${avg > 0 ? `<span class="comp-avg-badge" style="background:rgba(212,255,58,.18);color:#D4FF3A">${avg.toFixed(1)}/3</span>` : `<span style="font-size:11px;color:rgba(255,255,255,.35)">—</span>`}
        </div>
        <div class="prog-wrap" style="background:rgba(0,0,0,.1)"><div class="prog-bar" style="width:${pct}%;background:${lvl.bar}"></div></div>
        ${scRows}
      </div>`
    }
    const blocT = comps.filter(c => c.bloc === 'tunnel_vente')
    const blocX = comps.filter(c => c.bloc === 'transversales')
    const compBlocks = [
      '<div class="sec-label">Bloc 1 — Tunnel de vente</div>',
      ...blocT.map(renderComp),
      '<div class="sec-label" style="margin-top:16px">Bloc 2 — Compétences transversales</div>',
      ...blocX.map(renderComp),
    ].join('')

    const priorityItems = comps.flatMap(c =>
      c.sous.filter(sc => evals[sc.id]?.is_priority).map(sc => {
        const ev = evals[sc.id] || { score: 0 }
        const slvl = SCORES[ev.score] || SCORES[0]
        return `<div class="prio-item">
          <div class="prio-star">★</div>
          <div style="flex:1">
            <div class="prio-sc">${sc.title}</div>
            <div class="prio-comp">${c.title}</div>
          </div>
          <span class="sc-badge" style="background:${slvl.bg};color:${slvl.color}">${ev.score === 0 ? '— Non évalué' : `${ev.score}/3 — ${slvl.label}`}</span>
        </div>`
      })
    )

    const prioritySection = priorityItems.length ? `
      <div class="sec-label" style="margin-top:24px">Axes prioritaires</div>
      ${priorityItems.join('')}
    ` : ''

    openPrint(`
      <div class="header">
        <div>
          <div class="logo-row"><div class="logo-squares"><div class="sq"></div><div class="sq"></div><div class="sq"></div></div><span class="logo-name">PREMIÈRE LIGNE</span></div>
          <div class="logo-slogan">On forme là où ça se joue</div>
        </div>
        <div class="hdr-right">
          <div class="hdr-title">${vendeur.full_name}</div>
          <div class="hdr-sub">${structureName ? structureName + ' · ' : ''}Évaluation du ${today}</div>
        </div>
      </div>
      <div class="body">
        <div class="sec-label">Évaluation des compétences</div>
        ${compBlocks}
        ${prioritySection}
      </div>
      <div class="footer">On forme là où ça se joue — premiereligne-app.fr</div>
    `, false)
  }

  async function printEquipe() {
    const teamData = await loadTeam()
    const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

    const vendeurRanked = vendeurs.map(v => {
      const scores = comps.flatMap(c => c.sous.map(sc => teamData[v.id]?.[sc.id] || 0)).filter(s => s > 0)
      const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
      return { ...v, avg }
    }).sort((a, b) => b.avg - a.avg)

    const compAvgs = comps.map(comp => {
      const scores = comp.sous.flatMap(sc => vendeurs.map(v => teamData[v.id]?.[sc.id] || 0)).filter(s => s > 0)
      const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
      return { ...comp, avg }
    })

    const weakest = compAvgs.filter(c => c.avg > 0).sort((a, b) => a.avg - b.avg).slice(0, 3)

    const medalBgs = ['#FFD700', '#C0C0C0', '#CD7F32']
    const rankingRows = vendeurRanked.map((v, i) => {
      const lvl = levelOf(v.avg)
      const initials = (v.full_name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
      return `<div class="rank-item">
        <div class="rank-num" style="background:${i < 3 ? medalBgs[i] : '#eee'};color:${i < 3 ? '#fff' : '#666'}">${i + 1}</div>
        <div class="rank-avatar">${initials}</div>
        <div style="flex:1"><div class="rank-name">${v.full_name}</div></div>
        ${v.avg > 0 ? `<span class="sc-badge" style="background:${lvl.bg};color:${lvl.color}">${v.avg.toFixed(1)}/3</span>` : `<span style="font-size:11px;color:#aaa">Non évalué</span>`}
      </div>`
    }).join('')

    const weakCards = weakest.map(c => {
      const lvl = levelOf(c.avg)
      const pct = Math.round((c.avg / 3) * 100)
      return `<div class="weak-card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <div class="cbadge">${String(c.numero).padStart(2, '0')}</div>
          <div style="flex:1;font-size:11px;font-weight:600;color:#0B3D2E;line-height:1.3">${c.title}</div>
          <span class="sc-badge" style="background:${lvl.bg};color:${lvl.color}">${c.avg.toFixed(1)}/3</span>
        </div>
        <div style="height:5px;background:#e8e8e8;border-radius:4px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${lvl.bar};border-radius:4px"></div>
        </div>
      </div>`
    }).join('')

    const vendeurBlocks = vendeurRanked.map(v => {
      const lvl = levelOf(v.avg)
      const initials = (v.full_name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
      const compMinis = comps.map(comp => {
        const cscores = comp.sous.map(sc => teamData[v.id]?.[sc.id] || 0).filter(s => s > 0)
        const cavg = cscores.length ? cscores.reduce((a, b) => a + b, 0) / cscores.length : 0
        const cpct = Math.round((cavg / 3) * 100)
        const clvl = levelOf(cavg)
        return `<div class="mini-bar-row">
          <div class="mini-num">${String(comp.numero).padStart(2, '0')}</div>
          <div style="flex:1"><div style="height:6px;background:#ebebeb;border-radius:3px;overflow:hidden"><div style="width:${cpct}%;height:100%;background:${clvl.bar};border-radius:3px"></div></div></div>
          <div class="mini-score" style="color:${cavg > 0 ? clvl.color : '#bbb'}">${cavg > 0 ? cavg.toFixed(1) : '—'}</div>
        </div>`
      }).join('')

      return `<div class="vendeur-block">
        <div class="vendeur-hdr">
          <div class="rank-avatar" style="background:rgba(212,255,58,.22);color:#D4FF3A">${initials}</div>
          <div style="flex:1"><div style="font-size:13px;font-weight:700;color:#fff">${v.full_name}</div></div>
          ${v.avg > 0 ? `<span class="comp-avg-badge" style="background:rgba(212,255,58,.18);color:#D4FF3A">${v.avg.toFixed(1)}/3</span>` : `<span style="font-size:11px;color:rgba(255,255,255,.4)">Non évalué</span>`}
        </div>
        <div class="mini-bars-grid">${compMinis}</div>
      </div>`
    }).join('')

    openPrint(`
      <div class="header">
        <div>
          <div class="logo-row"><div class="logo-squares"><div class="sq"></div><div class="sq"></div><div class="sq"></div></div><span class="logo-name">PREMIÈRE LIGNE</span></div>
          <div class="logo-slogan">On forme là où ça se joue</div>
        </div>
        <div class="hdr-right">
          <div class="hdr-title">Fiche Équipe</div>
          <div class="hdr-sub">${structureName ? structureName + ' · ' : ''}${vendeurs.length} vendeurs · ${today}</div>
        </div>
      </div>
      <div class="body">
        <div class="sec-label">Classement équipe</div>
        <div class="ranking-grid">${rankingRows}</div>
        ${weakest.length ? `<div class="sec-label">Compétences à renforcer</div><div class="weak-grid">${weakCards}</div>` : ''}
        <div class="sec-label">Détail par vendeur</div>
        <div class="vendeur-grid">${vendeurBlocks}</div>
      </div>
      <div class="footer">On forme là où ça se joue — premiereligne-app.fr</div>
    `, false)
  }

  function openPrint(content, landscape) {
    const win = window.open('', '_blank', 'width=960,height=700')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;background:#F4F2EE;color:#1a1a1a;font-size:13px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .header{background:#0B3D2E;padding:26px 36px;display:flex;align-items:center;justify-content:space-between;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .logo-row{display:flex;align-items:center;gap:10px}
      .logo-squares{display:flex;gap:3px}
      .sq{width:14px;height:14px;background:#D4FF3A;border-radius:3px}
      .logo-name{font-size:20px;font-weight:800;color:#fff;letter-spacing:.5px}
      .logo-slogan{font-size:11px;font-style:italic;color:#D4FF3A;margin-top:5px}
      .hdr-right{text-align:right}
      .hdr-title{font-size:22px;font-weight:700;color:#fff}
      .hdr-sub{font-size:12px;color:rgba(255,255,255,.6);margin-top:4px}
      .body{padding:22px 36px 16px}
      .sec-label{font-size:10px;font-weight:700;color:#0B3D2E;text-transform:uppercase;letter-spacing:1.5px;display:flex;align-items:center;gap:10px;margin:18px 0 10px}
      .sec-label::after{content:'';flex:1;height:2px;background:linear-gradient(to right,#D4FF3A,transparent)}
      .comp-block{background:#fff;border-radius:8px;margin-bottom:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);page-break-inside:avoid;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .comp-hdr{display:flex;align-items:center;gap:10px;padding:10px 14px;background:#0B3D2E;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .cbadge{width:24px;height:24px;background:#D4FF3A;border-radius:5px;font-size:10px;font-weight:700;color:#0B3D2E;flex-shrink:0;display:flex;align-items:center;justify-content:center}
      .comp-name{flex:1;font-size:12px;font-weight:600;color:#fff}
      .comp-avg-badge{padding:2px 9px;border-radius:4px;font-size:11px;font-weight:700}
      .prog-wrap{height:3px}
      .prog-bar{height:100%}
      .sc-row{display:flex;align-items:center;padding:6px 14px;border-bottom:1px solid #f2f2f0;gap:8px}
      .sc-row:last-child{border-bottom:none}
      .sc-name{flex:1;font-size:11px;color:#333}
      .sc-badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;white-space:nowrap}
      .prio-item{display:flex;align-items:center;gap:10px;background:#fff;border-radius:8px;padding:9px 13px;box-shadow:0 1px 3px rgba(0,0,0,.06);margin-bottom:6px;page-break-inside:avoid}
      .prio-star{width:26px;height:26px;background:#D4FF3A;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;color:#0B3D2E;flex-shrink:0}
      .prio-sc{font-size:12px;font-weight:600;color:#0B3D2E}
      .prio-comp{font-size:10px;color:#888}
      .footer{text-align:center;padding:14px 36px;color:#bbb;font-size:10px;border-top:1px solid #e0e0e0;margin-top:8px}
      .ranking-grid{display:flex;flex-direction:column;gap:6px}
      .rank-item{display:flex;align-items:center;gap:10px;background:#fff;border-radius:8px;padding:9px 13px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
      .rank-num{width:26px;height:26px;border-radius:7px;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .rank-avatar{width:28px;height:28px;border-radius:7px;background:#0B3D2E;color:#D4FF3A;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .rank-name{font-size:13px;font-weight:600;color:#1a1a1a}
      .weak-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
      .weak-card{background:#fff;border-radius:8px;padding:12px 14px;box-shadow:0 1px 3px rgba(0,0,0,.07)}
      .vendeur-grid{display:flex;flex-direction:column;gap:10px}
      .vendeur-block{background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);page-break-inside:avoid}
      .vendeur-hdr{display:flex;align-items:center;gap:10px;padding:10px 14px;background:#0B3D2E;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .mini-bars-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;padding:10px 14px}
      .mini-bar-row{display:flex;align-items:center;gap:6px}
      .mini-num{font-size:9px;font-weight:700;color:#0B3D2E;background:#D4FF3A;width:18px;height:18px;border-radius:3px;display:flex;align-items:center;justify-content:center;flex-shrink:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .mini-score{font-size:10px;font-weight:700;min-width:26px;text-align:right;flex-shrink:0}
      @media print{body{background:#F4F2EE}@page{margin:.7cm;size:A4${landscape ? ' landscape' : ''}}}
    </style></head><body>${content}</body></html>`)
    win.document.close()
    setTimeout(() => { win.focus(); win.print() }, 500)
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

            {!loadingVendeur && [
              { bloc: 'tunnel_vente',  label: 'BLOC 1 — TUNNEL DE VENTE' },
              { bloc: 'transversales', label: 'BLOC 2 — COMPÉTENCES TRANSVERSALES' },
            ].flatMap(({ bloc, label }) => [
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0 12px' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--forest)', letterSpacing: '1.2px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</span>
                <div style={{ flex: 1, height: 1, background: 'var(--forest)', opacity: .2 }} />
              </div>,
              ...comps.filter(c => c.bloc === bloc).map(comp => {
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
            }),
            ])}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { bloc: 'tunnel_vente',  label: 'Tunnel de vente' },
              { bloc: 'transversales', label: 'Compétences transversales' },
            ].flatMap(({ bloc, label }) => [
              <div key={label} style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', letterSpacing: '.8px', textTransform: 'uppercase', paddingTop: 10, paddingBottom: 4 }}>{label}</div>,
              ...comps.filter(c => c.bloc === bloc).map(comp => {
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
            }),
            ])}
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
