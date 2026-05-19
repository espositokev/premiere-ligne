import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { SCORE_LABELS, SCORE_STYLES } from '../../lib/utils'
import { IconInfoCircle, IconChevronUp, IconChevronDown, IconCheck, IconBook2 } from '@tabler/icons-react'

export default function VendeurEvalPage() {
  const { profile } = useAuth()
  const [competences, setCompetences] = useState([])
  const [evaluations, setEvaluations] = useState({})
  const [vendeurDojos, setVendeurDojos] = useState([])
  const [openBlocks, setOpenBlocks] = useState({})
  const [loading, setLoading] = useState(true)
  const [managerName, setManagerName] = useState('')

  useEffect(() => { if (profile?.structure_id) load() }, [profile?.structure_id])

  async function load() {
    const [{ data: comps }, { data: evals }, { data: vd }, { data: mgr }] = await Promise.all([
      supabase.from('competences').select('*, sous_competences(*)').eq('structure_id', profile.structure_id).order('numero'),
      supabase.from('evaluations').select('*').eq('vendeur_id', profile.id),
      supabase.from('vendeur_dojos').select('*, dojos(title)').eq('vendeur_id', profile.id),
      supabase.from('profiles').select('full_name').eq('structure_id', profile.structure_id).eq('role', 'manager').single(),
    ])

    const evalMap = {}
    evals?.forEach(e => { evalMap[e.sous_competence_id] = e.score })
    setEvaluations(evalMap)
    setVendeurDojos(vd || [])

    const enriched = (comps || []).map(c => ({
      ...c,
      sous: (c.sous_competences || []).sort((a, b) => a.order_index - b.order_index),
    }))
    setCompetences(enriched)
    setManagerName(mgr?.full_name || 'votre manager')

    const opens = {}
    enriched.forEach(c => { opens[c.id] = true })
    setOpenBlocks(opens)
    setLoading(false)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={hdr}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 600, color: 'var(--fi)' }}>Mon évaluation</div>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 2 }}>Réalisée par {managerName} — lecture seule</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {/* Info box */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '12px 15px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: 'var(--sh)', marginBottom: 16 }}>
          <IconInfoCircle size={18} color="var(--forest)" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 12, color: 'var(--mu)' }}>
            L'évaluation est réalisée par ton manager. Les Dojos assignés apparaissent en face de chaque sous-compétence.
          </div>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--mu)' }}>Chargement…</div>}

        {!loading && competences.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <div style={{ fontSize: 13, color: 'var(--mu)' }}>Aucune évaluation disponible pour le moment.</div>
          </div>
        )}

        {[
          { bloc: 'tunnel_vente',  label: 'BLOC 1 — TUNNEL DE VENTE' },
          { bloc: 'transversales', label: 'BLOC 2 — COMPÉTENCES TRANSVERSALES' },
        ].flatMap(({ bloc, label }) => [
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0 12px' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--forest)', letterSpacing: '1.2px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</span>
            <div style={{ flex: 1, height: 1, background: 'var(--forest)', opacity: .2 }} />
          </div>,
          ...competences.filter(c => c.bloc === bloc).map(comp => {
          const isOpen = openBlocks[comp.id]
          const scoredSous = comp.sous.filter(s => evaluations[s.id] > 0)

          return (
            <div key={comp.id} style={{ background: '#fff', borderRadius: 14, boxShadow: 'var(--sh)', overflow: 'hidden', marginBottom: 10 }}>
              <div
                onClick={() => setOpenBlocks(prev => ({ ...prev, [comp.id]: !prev[comp.id] }))}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', cursor: 'pointer', borderBottom: isOpen ? '1px solid var(--ln)' : '1px solid transparent' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--fluo)' }}>
                    {String(comp.numero).padStart(2, '0')}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fi)' }}>{comp.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 1 }}>{comp.sous.length} sous-compétences</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 80, height: 5, background: 'var(--ln)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ width: comp.sous.length ? `${(scoredSous.length / comp.sous.length) * 100}%` : '0%', height: '100%', background: 'linear-gradient(90deg,var(--forest),var(--fl))', borderRadius: 10 }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fi)' }}>{scoredSous.length}/{comp.sous.length}</span>
                  </div>
                  {isOpen ? <IconChevronUp size={14} color="var(--mu)" /> : <IconChevronDown size={14} color="var(--mu)" />}
                </div>
              </div>

              {isOpen && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 110px 75px 1fr', padding: '8px 16px 6px', fontSize: 10, fontWeight: 600, color: 'var(--mu)', letterSpacing: '.4px', textTransform: 'uppercase', background: 'var(--bg)', borderBottom: '1px solid var(--ln)', gap: 10 }}>
                    <span>Sous-compétence</span><span>Évaluation</span><span>Score</span><span>Dojo</span>
                  </div>
                  {comp.sous.map((sc, idx) => {
                    const score = evaluations[sc.id] || 0
                    const st = SCORE_STYLES[score]
                    const myDojo = vendeurDojos.find(vd => vd.dojos && vd.dojo_id)

                    return (
                      <div key={sc.id} style={{ display: 'grid', gridTemplateColumns: '2fr 110px 75px 1fr', alignItems: 'center', padding: '10px 16px', borderBottom: idx < comp.sous.length - 1 ? '1px solid var(--ln)' : 'none', gap: 10 }}>
                        <div style={{ fontSize: 13, color: 'var(--fi)', fontWeight: score === 1 ? 600 : 400 }}>
                          {score === 1 && '⚡ '}{sc.title}
                        </div>
                        <div style={{ display: 'flex', gap: 3, pointerEvents: 'none' }}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <span key={star} style={{ fontSize: 17, color: star <= score ? '#F59E0B' : 'var(--ln)', lineHeight: 1 }}>★</span>
                          ))}
                        </div>
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 7, fontSize: 11, fontWeight: 600, background: st.bg, color: st.color }}>
                          {SCORE_LABELS[score]}
                        </span>
                        <div>
                          {vendeurDojos
                            .filter(vd => vd.dojos)
                            .slice(0, 1)
                            .map(vd => (
                              <span key={vd.id} style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                padding: '4px 9px', borderRadius: 8, fontSize: 11, fontWeight: 500,
                                border: vd.status === 'validated' ? '1px solid #86EFAC' : '1px solid var(--forest)',
                                background: vd.status === 'validated' ? '#DCFCE7' : 'var(--forest)',
                                color: vd.status === 'validated' ? '#166534' : 'var(--fluo)',
                              }}>
                                {vd.status === 'validated' ? <IconCheck size={13} /> : <IconBook2 size={13} />}
                                {vd.dojos?.title}
                              </span>
                            ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        }),
        ])}
      </div>
    </div>
  )
}

const hdr = { padding: '18px 24px 14px', background: '#fff', borderBottom: '1px solid var(--ln)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, boxShadow: '0 1px 4px rgba(7,40,32,.04)' }
