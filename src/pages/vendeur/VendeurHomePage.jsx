import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { daysUntil } from '../../lib/utils'
import { IconChevronRight, IconBolt } from '@tabler/icons-react'

export default function VendeurHomePage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [comps, setComps] = useState([])
  const [sessions, setSessions] = useState([])
  const [badges, setBadges] = useState([])
  const [defi, setDefi] = useState(null)

  useEffect(() => { if (profile?.id) load() }, [profile?.id])

  async function load() {
    const today = new Date().toISOString().split('T')[0]

    const [{ data: compData }, { data: evalData }, { data: sessData }, { data: bdgData }, { data: defiData }] = await Promise.all([
      supabase.from('competences')
        .select('id, title, numero, sous_competences(id)')
        .eq('structure_id', profile.structure_id)
        .order('numero'),
      supabase.from('evaluations')
        .select('sous_competence_id, score')
        .eq('vendeur_id', profile.id),
      supabase.from('coaching_sessions')
        .select('id, scheduled_date, notes, dojos!dojo_id(title), sous_competences!sous_comp_id(title)')
        .eq('vendeur_id', profile.id)
        .eq('status', 'planned')
        .gte('scheduled_date', today)
        .order('scheduled_date')
        .limit(3),
      supabase.from('vendeur_badges')
        .select('id, badges(name, icon)')
        .eq('vendeur_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase.from('defis')
        .select('id, title, description')
        .eq('structure_id', profile.structure_id)
        .order('created_at', { ascending: false })
        .limit(1),
    ])

    // Score moyen par compétence
    const evalMap = {}
    evalData?.forEach(e => { evalMap[e.sous_competence_id] = e.score })

    const enrichedComps = (compData || []).map(comp => {
      const scIds = comp.sous_competences?.map(s => s.id) || []
      const scores = scIds.map(id => evalMap[id]).filter(s => s > 0)
      const avg = scores.length
        ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
        : null
      return { ...comp, avg, evaluated: scores.length, total: scIds.length }
    })

    setComps(enrichedComps)
    setSessions(sessData || [])
    setBadges(bdgData || [])
    setDefi(defiData?.[0] || null)
    setLoading(false)
  }

  const firstName = profile?.full_name?.split(' ')[0] || ''

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={hdr}>
        <div style={{ fontSize: 19, fontWeight: 600, color: 'var(--fi)' }}>Bonjour, {firstName} 👋</div>
        <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 2 }}>Votre tableau de bord</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {loading && <div style={{ textAlign: 'center', padding: 60, color: 'var(--mu)' }}>Chargement…</div>}

        {!loading && (
          <>
            {/* Matrice résumée */}
            <Card title="Mon évaluation" action={{ label: 'Voir le détail', onClick: () => navigate('/mon-evaluation') }}>
              {comps.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--mu)', padding: '4px 0' }}>
                  Aucune évaluation disponible pour le moment.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {comps.map(comp => {
                    const avg = comp.avg ? parseFloat(comp.avg) : 0
                    const pct = Math.round((avg / 5) * 100)
                    const color = !comp.avg ? 'var(--ln)'
                      : avg >= 4 ? '#22C55E'
                      : avg >= 3 ? '#2563EB'
                      : avg >= 2 ? '#D97706'
                      : '#DC2626'
                    return (
                      <div key={comp.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: 6, background: 'var(--forest)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 700, color: 'var(--fluo)', flexShrink: 0,
                        }}>
                          {String(comp.numero).padStart(2, '0')}
                        </div>
                        <div style={{
                          fontSize: 12, fontWeight: 500, color: 'var(--fi)', flex: 1,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {comp.title}
                        </div>
                        <div style={{ width: 72, height: 5, background: 'var(--ln)', borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 10 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: comp.avg ? color : 'var(--mu)', minWidth: 26, textAlign: 'right' }}>
                          {comp.avg || '—'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>

            {/* Prochaines sessions */}
            <Card title="Mes prochaines sessions" action={{ label: 'Tout voir', onClick: () => navigate('/mon-plan') }}>
              {sessions.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--mu)', padding: '4px 0' }}>
                  Aucune session planifiée pour le moment.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {sessions.map(s => (
                    <div key={s.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', borderRadius: 9,
                      background: 'var(--bg)', borderLeft: '3px solid var(--forest)',
                    }}>
                      <div style={{ textAlign: 'center', minWidth: 34, flexShrink: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--forest)', lineHeight: 1 }}>
                          {new Date(s.scheduled_date + 'T00:00:00').getDate()}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--mu)', textTransform: 'uppercase' }}>
                          {new Date(s.scheduled_date + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'short' })}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fi)' }}>
                          {s.sous_competences?.title || s.dojos?.title || 'Session de coaching'}
                        </div>
                        {s.notes && <div style={{ fontSize: 11, color: 'var(--mu)' }}>{s.notes}</div>}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--forest)', flexShrink: 0 }}>
                        {daysUntil(s.scheduled_date)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Défi + Badges */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Card title="Défi en cours" small>
                {defi ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <IconBolt size={15} color="#F59E0B" />
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fi)' }}>{defi.title}</span>
                    </div>
                    {defi.description && (
                      <div style={{ fontSize: 11, color: 'var(--mu)', lineHeight: 1.4 }}>{defi.description}</div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--mu)' }}>Aucun défi en cours.</div>
                )}
              </Card>

              <Card title="Mes badges" action={{ label: 'Voir tout', onClick: () => navigate('/mes-badges') }} small>
                {badges.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--mu)' }}>Aucun badge encore.</div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {badges.map(b => (
                      <div key={b.id} style={{
                        width: 36, height: 36, borderRadius: 9, background: '#D4FF3A',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                      }} title={b.badges?.name}>
                        {b.badges?.icon || '🏅'}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Card({ title, children, action, small }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, boxShadow: 'var(--sh)', overflow: 'hidden', marginBottom: 14 }}>
      <div style={{
        padding: small ? '10px 14px' : '12px 16px',
        borderBottom: '1px solid var(--ln)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: small ? 12 : 14, fontWeight: 600, color: 'var(--fi)' }}>{title}</span>
        {action && (
          <button
            onClick={action.onClick}
            style={{
              background: 'none', border: 'none', fontSize: 11, color: 'var(--forest)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 500,
            }}
          >
            {action.label} <IconChevronRight size={12} />
          </button>
        )}
      </div>
      <div style={{ padding: small ? '10px 14px' : '12px 16px' }}>{children}</div>
    </div>
  )
}

const hdr = {
  padding: '18px 24px 14px', background: '#fff', borderBottom: '1px solid var(--ln)',
  flexShrink: 0, boxShadow: '0 1px 4px rgba(7,40,32,.04)',
}
