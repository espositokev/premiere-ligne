import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { Avatar } from '../../components/Avatar'
import { SCORE_STYLES, SCORE_LABELS, formatDate } from '../../lib/utils'
import { IconPlus, IconFlame, IconArrowRight } from '@tabler/icons-react'

export default function DashboardPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [team, setTeam] = useState([])
  const [stats, setStats] = useState({ dojos: 0, score: 0, actifs: 0, defis: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.structure_id) return
    loadData()
  }, [profile?.structure_id])

  async function loadData() {
    const structureId = profile.structure_id

    const [{ data: vendeurs }, { data: dojoStats }, { data: evalStats }] = await Promise.all([
      supabase.from('profiles')
        .select('id, full_name, poste, streak, xp_total')
        .eq('structure_id', structureId)
        .eq('role', 'vendeur'),
      supabase.from('vendeur_dojos')
        .select('vendeur_id', { count: 'exact' })
        .eq('status', 'validated')
        .in('vendeur_id', []),
      supabase.from('evaluations').select('score, vendeur_id'),
    ])

    // Charger les dojos validés et l'éval pour chaque vendeur
    if (vendeurs && vendeurs.length > 0) {
      const ids = vendeurs.map(v => v.id)
      const firstOfMonth = new Date()
      firstOfMonth.setDate(1)
      firstOfMonth.setHours(0, 0, 0, 0)
      const [{ data: vDojos }, { data: evals }, { data: activePlans }, { data: actifsData }] = await Promise.all([
        supabase.from('vendeur_dojos').select('vendeur_id, dojo_id, status, dojos(title)')
          .in('vendeur_id', ids).eq('status', 'assigned'),
        supabase.from('evaluations').select('vendeur_id, score').in('vendeur_id', ids),
        supabase.from('plans').select('vendeur_id, id').in('vendeur_id', ids).eq('status', 'active'),
        supabase.from('vendeur_dojos').select('vendeur_id').in('vendeur_id', ids)
          .gte('created_at', firstOfMonth.toISOString()),
      ])
      const actifsCount = new Set(actifsData?.map(d => d.vendeur_id) || []).size

      const enriched = vendeurs.map(v => {
        const myEvals = evals?.filter(e => e.vendeur_id === v.id) || []
        const avgScore = myEvals.length
          ? (myEvals.reduce((s, e) => s + e.score, 0) / myEvals.length).toFixed(1)
          : null
        const currentDojo = vDojos?.find(d => d.vendeur_id === v.id)
        const hasPlan = activePlans?.some(p => p.vendeur_id === v.id)
        return { ...v, avgScore, currentDojo, hasPlan }
      })
      setTeam(enriched)

      // Stats globales
      const allValidated = await supabase.from('vendeur_dojos')
        .select('id', { count: 'exact' })
        .in('vendeur_id', ids).eq('status', 'validated')
      const scoreVals = enriched.filter(v => v.avgScore).map(v => parseFloat(v.avgScore))
      const avgGlobal = scoreVals.length ? (scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length).toFixed(1) : 0
      setStats({
        dojos: allValidated.count || 0,
        score: avgGlobal,
        actifs: actifsCount,
        defis: 0,
      })
    }
    setLoading(false)
  }

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const firstName = profile?.full_name?.split(' ')[0] || ''
  const structureName = profile?.structures?.name || ''

  function getStatus(score) {
    if (!score) return { label: 'Sans éval.', bg: 'var(--bg)', color: 'var(--mu)' }
    const s = parseFloat(score)
    if (s >= 4.2) return { label: 'Top', bg: '#D4FF3A', color: '#072820' }
    if (s >= 3) return { label: 'En prog.', bg: '#DCFCE7', color: '#166534' }
    if (s >= 2) return { label: 'À suivre', bg: '#FEF9C3', color: '#854D0E' }
    return { label: 'Attention', bg: '#FEE2E2', color: '#991B1B' }
  }

  function getBarColor(score) {
    if (!score) return 'var(--ln)'
    const s = parseFloat(score)
    if (s >= 4) return 'linear-gradient(90deg,#16A34A,#22C55E)'
    if (s >= 3) return 'linear-gradient(90deg,var(--forest),var(--fl))'
    if (s >= 2) return 'linear-gradient(90deg,#D97706,#FBBF24)'
    return 'linear-gradient(90deg,#DC2626,#EF4444)'
  }

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
            {today} — {structureName}
          </div>
        </div>
        <button onClick={() => navigate('/plans')} style={btnPrimaryStyle}>
          <IconPlus size={15} /> Nouveau plan
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 22 }}>
          <StatCard gradient label="Dojos validés" value={stats.dojos} delta="+8 ce mois" dark />
          <StatCard label="Score moyen" value={`${stats.score}/5`} delta="+0.4 vs M-1" deltaUp />
          <StatCard gradient2 label="Vendeurs actifs" value={stats.actifs} delta="Ce mois" dark />
          <StatCard label="Défis relevés" value={stats.defis} delta="Cette semaine" deltaUp />
        </div>

        {/* Section équipe */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fi)' }}>Mon équipe</div>
          <button onClick={() => navigate('/equipe')} style={btnGhostSmStyle}>
            Voir tout <IconArrowRight size={13} />
          </button>
        </div>

        <div style={{ background: '#fff', borderRadius: 14, boxShadow: 'var(--sh)', overflow: 'hidden', marginBottom: 22 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.1fr 1.3fr .8fr 110px', padding: '10px 18px', fontSize: 10, fontWeight: 600, color: 'var(--mu)', letterSpacing: '.5px', textTransform: 'uppercase', borderBottom: '1px solid var(--ln)', background: 'var(--bg)' }}>
            <span>Commercial</span><span>Score /5</span><span>Dojo en cours</span><span>Streak</span><span>Statut</span>
          </div>

          {loading && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--mu)', fontSize: 13 }}>
              Chargement…
            </div>
          )}

          {!loading && team.length === 0 && (
            <div style={{ padding: '32px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>👥</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fi)', marginBottom: 4 }}>
                Aucun vendeur dans l'équipe
              </div>
              <div style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 16 }}>
                Invitez vos vendeurs depuis les Paramètres
              </div>
              <button onClick={() => navigate('/parametres')} style={btnPrimaryStyle}>
                Aller aux Paramètres
              </button>
            </div>
          )}

          {team.map((v, i) => {
            const status = getStatus(v.avgScore)
            const pct = v.avgScore ? Math.round((parseFloat(v.avgScore) / 5) * 100) : 0
            return (
              <div
                key={v.id}
                onClick={() => navigate('/matrice', { state: { vendeurId: v.id } })}
                style={{
                  display: 'grid', gridTemplateColumns: '2fr 1.1fr 1.3fr .8fr 110px',
                  padding: '12px 18px', borderBottom: i < team.length - 1 ? '1px solid var(--ln)' : 'none',
                  alignItems: 'center', cursor: 'pointer', transition: 'background .12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={v.full_name} id={v.id} size={32} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fi)' }}>{v.full_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--mu)' }}>{v.poste || 'Commercial'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 6, background: 'var(--ln)', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', borderRadius: 10, background: getBarColor(v.avgScore) }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fi)', minWidth: 26, textAlign: 'right' }}>
                    {v.avgScore || '—'}
                  </span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fi)' }}>
                  {v.currentDojo?.dojos?.title || '—'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, color: 'var(--mu)' }}>
                  <IconFlame size={15} color="#F97316" />{v.streak || 0}j
                </div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', padding: '3px 9px',
                  borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: status.bg, color: status.color,
                }}>
                  {status.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, delta, deltaUp, dark, gradient, gradient2 }) {
  const bg = gradient
    ? 'linear-gradient(135deg,#0B3D2E,#1a5c42)'
    : gradient2
    ? 'linear-gradient(135deg,#072820,#0B3D2E)'
    : '#fff'
  const isDark = dark || gradient || gradient2
  return (
    <div style={{ borderRadius: 14, padding: '16px 18px', boxShadow: 'var(--sh)', background: bg }}>
      <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 8, color: isDark ? 'rgba(255,255,255,.6)' : 'var(--mu)' }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: isDark ? (gradient2 ? '#D4FF3A' : '#fff') : 'var(--fi)' }}>
        {value}
      </div>
      <div style={{ fontSize: 11, marginTop: 5, color: isDark ? 'rgba(255,255,255,.5)' : deltaUp ? '#22C55E' : 'var(--mu)' }}>
        {delta}
      </div>
    </div>
  )
}

const btnPrimaryStyle = {
  background: 'var(--forest)', color: 'var(--fluo)', border: 'none',
  padding: '9px 17px', borderRadius: 9, fontSize: 13, fontWeight: 600,
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
  boxShadow: '0 2px 8px rgba(11,61,46,.2)',
}

const btnGhostSmStyle = {
  background: '#fff', color: 'var(--fi)', border: '1px solid var(--ln)',
  padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6,
}
