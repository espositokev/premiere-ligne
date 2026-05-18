import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { Avatar } from '../../components/Avatar'
import { formatDate } from '../../lib/utils'
import {
  IconPlus, IconAlertTriangle, IconCalendar,
  IconArrowRight, IconUsers, IconMedal, IconTarget,
} from '@tabler/icons-react'

export default function DashboardPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [alertes, setAlertes] = useState([])
  const [topComps, setTopComps] = useState([])
  const [nextSessions, setNextSessions] = useState([])
  const [resume, setResume] = useState({ vendeurs: 0, sessionsMois: 0, badgesTotal: 0 })

  useEffect(() => {
    if (!profile?.structure_id) return
    loadData()
  }, [profile?.structure_id])

  async function loadData() {
    const structureId = profile.structure_id
    const today = new Date().toISOString().split('T')[0]
    const firstOfMonth = new Date()
    firstOfMonth.setDate(1)
    firstOfMonth.setHours(0, 0, 0, 0)
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const { data: vendeurs } = await supabase.from('profiles')
      .select('id, full_name, poste')
      .eq('structure_id', structureId)
      .eq('role', 'vendeur')

    if (!vendeurs?.length) {
      setResume({ vendeurs: 0, sessionsMois: 0, badgesTotal: 0 })
      setLoading(false)
      return
    }
    const ids = vendeurs.map(v => v.id)

    const [
      { data: evalData },
      { data: sessions },
      { data: valSessions },
      { data: bdgData },
      { data: compData },
    ] = await Promise.all([
      supabase.from('evaluations')
        .select('vendeur_id, sous_competence_id, score, evaluated_at')
        .in('vendeur_id', ids),
      supabase.from('coaching_sessions')
        .select('id, scheduled_date, profiles!vendeur_id(full_name), dojos!dojo_id(titre)')
        .eq('structure_id', structureId)
        .eq('status', 'planned')
        .gte('scheduled_date', today)
        .order('scheduled_date')
        .limit(3),
      supabase.from('coaching_sessions')
        .select('id')
        .eq('structure_id', structureId)
        .eq('status', 'validated')
        .gte('validated_at', firstOfMonth.toISOString()),
      supabase.from('vendeur_badges')
        .select('id')
        .in('vendeur_id', ids),
      supabase.from('competences')
        .select('id, title, sous_competences(id)')
        .eq('structure_id', structureId)
        .order('numero'),
    ])

    // Alertes : vendeurs sans éval ou dernière éval > 3 mois
    const lastEvalByVendeur = {}
    evalData?.forEach(e => {
      const prev = lastEvalByVendeur[e.vendeur_id]
      if (!prev || new Date(e.evaluated_at) > new Date(prev)) {
        lastEvalByVendeur[e.vendeur_id] = e.evaluated_at
      }
    })
    const alertVendeurs = vendeurs
      .filter(v => {
        const last = lastEvalByVendeur[v.id]
        return !last || new Date(last) < threeMonthsAgo
      })
      .map(v => ({ ...v, lastEval: lastEvalByVendeur[v.id] || null }))

    // Top compétences à travailler (scores moyens les plus bas)
    const scToComp = {}
    compData?.forEach(comp => {
      comp.sous_competences?.forEach(sc => {
        scToComp[sc.id] = { id: comp.id, title: comp.title }
      })
    })
    const compScores = {}
    evalData?.forEach(e => {
      const comp = scToComp[e.sous_competence_id]
      if (!comp || !e.score) return
      if (!compScores[comp.id]) compScores[comp.id] = { title: comp.title, scores: [] }
      compScores[comp.id].scores.push(e.score)
    })
    const topCompsData = Object.values(compScores)
      .map(c => ({
        title: c.title,
        avg: (c.scores.reduce((a, b) => a + b, 0) / c.scores.length).toFixed(1),
      }))
      .sort((a, b) => parseFloat(a.avg) - parseFloat(b.avg))
      .slice(0, 3)

    setAlertes(alertVendeurs)
    setTopComps(topCompsData)
    setNextSessions(sessions || [])
    setResume({
      vendeurs: vendeurs.length,
      sessionsMois: valSessions?.length || 0,
      badgesTotal: bdgData?.length || 0,
    })
    setLoading(false)
  }

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const firstName = profile?.full_name?.split(' ')[0] || ''

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '18px 24px 14px', background: '#fff',
        borderBottom: '1px solid var(--ln)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0, boxShadow: '0 1px 4px rgba(7,40,32,.04)',
      }}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 600, color: 'var(--fi)' }}>
            Bonjour, {firstName} 👋
          </div>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 2, textTransform: 'capitalize' }}>
            {today}
          </div>
        </div>
        <button onClick={() => navigate('/sessions')} style={btnPrimary}>
          <IconPlus size={15} /> Nouvelle session
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {loading && <div style={{ textAlign: 'center', padding: 60, color: 'var(--mu)' }}>Chargement…</div>}

        {!loading && (
          <>
            {/* Résumé chiffré */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
              <StatCard icon={IconUsers} label="Vendeurs" value={resume.vendeurs} />
              <StatCard icon={IconCalendar} label="Sessions validées" value={resume.sessionsMois} sub="Ce mois" gradient />
              <StatCard icon={IconMedal} label="Badges débloqués" value={resume.badgesTotal} sub="Total équipe" />
            </div>

            {/* Alertes évaluations */}
            {alertes.length > 0 && (
              <Section
                title="Évaluations à renouveler"
                icon={<IconAlertTriangle size={16} color="#DC2626" />}
                titleColor="#DC2626"
                action={{ label: 'Aller à la matrice', onClick: () => navigate('/matrice') }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {alertes.map(v => (
                    <div
                      key={v.id}
                      onClick={() => navigate('/matrice', { state: { vendeurId: v.id } })}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', borderRadius: 9,
                        background: '#FEF2F2', border: '1px solid #FECACA', cursor: 'pointer',
                      }}
                    >
                      <Avatar name={v.full_name} id={v.id} size={28} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fi)' }}>{v.full_name}</div>
                        <div style={{ fontSize: 11, color: '#DC2626' }}>
                          {v.lastEval
                            ? `Dernière éval : ${formatDate(v.lastEval)} — Plus de 3 mois`
                            : 'Jamais évalué'}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '3px 8px',
                        borderRadius: 20, background: '#FEE2E2', color: '#991B1B',
                      }}>
                        À renouveler
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Top compétences à travailler */}
            {topComps.length > 0 && (
              <Section
                title="Compétences prioritaires à travailler"
                icon={<IconTarget size={16} color="var(--forest)" />}
                action={{ label: 'Voir la matrice', onClick: () => navigate('/matrice') }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {topComps.map((c, i) => {
                    const avg = parseFloat(c.avg)
                    const pct = Math.round((avg / 5) * 100)
                    const color = avg < 2 ? '#DC2626' : avg < 3 ? '#D97706' : '#2563EB'
                    return (
                      <div key={c.title} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 9, background: 'var(--bg)' }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: 6, background: 'var(--forest)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, color: 'var(--fluo)', flexShrink: 0,
                        }}>
                          {i + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fi)', marginBottom: 4 }}>{c.title}</div>
                          <div style={{ height: 4, background: 'var(--ln)', borderRadius: 10, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 10 }} />
                          </div>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 30, textAlign: 'right' }}>{c.avg}/5</span>
                      </div>
                    )
                  })}
                </div>
              </Section>
            )}

            {/* Prochaines sessions */}
            <Section
              title="Prochaines sessions de coaching"
              icon={<IconCalendar size={16} color="var(--forest)" />}
              action={{ label: 'Toutes les sessions', onClick: () => navigate('/sessions') }}
            >
              {nextSessions.length === 0 ? (
                <div style={{ padding: '12px 0', textAlign: 'center', fontSize: 13, color: 'var(--mu)' }}>
                  Aucune session planifiée —{' '}
                  <span
                    style={{ color: 'var(--forest)', cursor: 'pointer', fontWeight: 600 }}
                    onClick={() => navigate('/sessions')}
                  >
                    en programmer une
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {nextSessions.map(s => (
                    <div
                      key={s.id}
                      onClick={() => navigate('/sessions')}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 12px', borderRadius: 9, background: 'var(--bg)', cursor: 'pointer',
                      }}
                    >
                      <div style={{ width: 38, textAlign: 'center', flexShrink: 0 }}>
                        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--forest)', lineHeight: 1 }}>
                          {new Date(s.scheduled_date + 'T00:00:00').getDate()}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--mu)', textTransform: 'uppercase' }}>
                          {new Date(s.scheduled_date + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'short' })}
                        </div>
                      </div>
                      <div style={{ width: 1, height: 30, background: 'var(--ln)', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fi)' }}>
                          {s.profiles?.full_name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--mu)' }}>
                          {s.dojos?.titre || 'Session de coaching'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, gradient }) {
  const dark = !!gradient
  return (
    <div style={{
      borderRadius: 14, padding: '16px 18px', boxShadow: 'var(--sh)',
      background: dark ? 'linear-gradient(135deg,#0B3D2E,#1a5c42)' : '#fff',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        <Icon size={15} color={dark ? 'rgba(255,255,255,.55)' : 'var(--mu)'} />
        <span style={{ fontSize: 11, fontWeight: 500, color: dark ? 'rgba(255,255,255,.55)' : 'var(--mu)' }}>{label}</span>
      </div>
      <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, color: dark ? '#D4FF3A' : 'var(--fi)' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, marginTop: 5, color: dark ? 'rgba(255,255,255,.45)' : 'var(--mu)' }}>{sub}</div>}
    </div>
  )
}

function Section({ title, icon, titleColor, action, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, boxShadow: 'var(--sh)', overflow: 'hidden', marginBottom: 16 }}>
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--ln)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon}
          <span style={{ fontSize: 14, fontWeight: 600, color: titleColor || 'var(--fi)' }}>{title}</span>
        </div>
        {action && (
          <button
            onClick={action.onClick}
            style={{
              background: 'none', border: 'none', fontSize: 12, color: 'var(--forest)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500,
            }}
          >
            {action.label} <IconArrowRight size={13} />
          </button>
        )}
      </div>
      <div style={{ padding: '12px 16px' }}>{children}</div>
    </div>
  )
}

const btnPrimary = {
  background: 'var(--forest)', color: 'var(--fluo)', border: 'none',
  padding: '9px 17px', borderRadius: 9, fontSize: 13, fontWeight: 600,
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
  boxShadow: '0 2px 8px rgba(11,61,46,.2)',
}
