import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { Avatar } from '../../components/Avatar'
import { IconUserPlus, IconFlame, IconArrowRight } from '@tabler/icons-react'

export default function EquipePage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (profile?.structure_id) load() }, [profile?.structure_id])

  async function load() {
    const { data: vendeurs } = await supabase.from('profiles')
      .select('id, full_name, poste, streak, xp_total')
      .eq('structure_id', profile.structure_id)
      .eq('role', 'vendeur')

    if (!vendeurs?.length) { setLoading(false); return }

    const ids = vendeurs.map(v => v.id)
    const [{ data: vDojos }, { data: evals }] = await Promise.all([
      supabase.from('vendeur_dojos').select('vendeur_id, dojos(titre)').in('vendeur_id', ids).eq('status', 'assigned'),
      supabase.from('evaluations').select('vendeur_id, score').in('vendeur_id', ids),
    ])

    setTeam(vendeurs.map(v => {
      const myEvals = evals?.filter(e => e.vendeur_id === v.id) || []
      const avgScore = myEvals.length
        ? (myEvals.reduce((s, e) => s + e.score, 0) / myEvals.length).toFixed(1)
        : null
      const currentDojo = vDojos?.find(d => d.vendeur_id === v.id)
      return { ...v, avgScore, currentDojo }
    }))
    setLoading(false)
  }

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

  const streaksActifs = team.filter(v => v.streak > 0).length
  const avgScore = team.filter(v => v.avgScore).length
    ? (team.filter(v => v.avgScore).reduce((s, v) => s + parseFloat(v.avgScore), 0) / team.filter(v => v.avgScore).length).toFixed(1)
    : 0

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '18px 24px 14px', background: '#fff', borderBottom: '1px solid var(--ln)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, boxShadow: '0 1px 4px rgba(7,40,32,.04)' }}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 600, color: 'var(--fi)' }}>Mon équipe</div>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 2 }}>{team.length} commerciaux — {profile?.structures?.name}</div>
        </div>
        <button onClick={() => navigate('/parametres')} style={btnPrimary}>
          <IconUserPlus size={15} /> Inviter un vendeur
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 22 }}>
          {[
            { label: 'Score moyen', value: avgScore, delta: 'Sur l\'équipe' },
            { label: 'Streaks actifs', value: `${streaksActifs}/${team.length}`, delta: 'Bonne forme' },
            { label: 'Commerciaux', value: team.length, delta: 'Dans l\'équipe' },
            { label: 'Évalués', value: team.filter(v => v.avgScore).length, delta: 'Ont un score' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', boxShadow: 'var(--sh)' }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--mu)', marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--fi)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#22C55E', marginTop: 5 }}>{s.delta}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: 'var(--sh)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.1fr 1.3fr .8fr 110px', padding: '10px 18px', fontSize: 10, fontWeight: 600, color: 'var(--mu)', letterSpacing: '.5px', textTransform: 'uppercase', borderBottom: '1px solid var(--ln)', background: 'var(--bg)' }}>
            <span>Commercial</span><span>Score /5</span><span>Dojo en cours</span><span>Streak</span><span>Statut</span>
          </div>

          {loading && <div style={{ padding: 24, textAlign: 'center', color: 'var(--mu)', fontSize: 13 }}>Chargement…</div>}

          {!loading && team.length === 0 && (
            <div style={{ padding: '40px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fi)', marginBottom: 6 }}>Aucun vendeur encore</div>
              <div style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 20 }}>Invitez vos vendeurs depuis les Paramètres pour commencer.</div>
              <button onClick={() => navigate('/parametres')} style={btnPrimary}>Aller aux Paramètres <IconArrowRight size={13} /></button>
            </div>
          )}

          {team.map((v, i) => {
            const status = getStatus(v.avgScore)
            const pct = v.avgScore ? Math.round((parseFloat(v.avgScore) / 5) * 100) : 0
            return (
              <div
                key={v.id}
                onClick={() => navigate('/matrice', { state: { vendeurId: v.id } })}
                style={{ display: 'grid', gridTemplateColumns: '2fr 1.1fr 1.3fr .8fr 110px', padding: '12px 18px', borderBottom: i < team.length - 1 ? '1px solid var(--ln)' : 'none', alignItems: 'center', cursor: 'pointer', transition: 'background .12s' }}
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
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fi)', minWidth: 26, textAlign: 'right' }}>{v.avgScore || '—'}</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{v.currentDojo?.dojos?.titre || '—'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--mu)' }}>
                  <IconFlame size={15} color="#F97316" />{v.streak || 0}j
                </div>
                <span style={{ display: 'inline-flex', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: status.bg, color: status.color }}>
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

const btnPrimary = {
  background: 'var(--forest)', color: 'var(--fluo)', border: 'none',
  padding: '9px 17px', borderRadius: 9, fontSize: 13, fontWeight: 600,
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
  boxShadow: '0 2px 8px rgba(11,61,46,.2)',
}
