import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

export default function VendeurBadgesPage() {
  const { profile } = useAuth()
  const [myBadges, setMyBadges] = useState([])
  const [allBadges, setAllBadges] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (profile?.id) load() }, [profile?.id])

  async function load() {
    const [{ data: all }, { data: mine }] = await Promise.all([
      supabase.from('badges').select('*'),
      supabase.from('vendeur_badges').select('badge_id').eq('vendeur_id', profile.id),
    ])
    setAllBadges(all || [])
    setMyBadges((mine || []).map(b => b.badge_id))
    setLoading(false)
  }

  const unlocked = allBadges.filter(b => myBadges.includes(b.id))
  const locked = allBadges.filter(b => !myBadges.includes(b.id))

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={hdr}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 600, color: 'var(--fi)' }}>Mes badges</div>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 2 }}>
            {unlocked.length} débloqué{unlocked.length > 1 ? 's' : ''} — basés sur tes Dojos validés
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--mu)' }}>Chargement…</div>}

        {!loading && (
          <>
            {unlocked.length > 0 && (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fi)', marginBottom: 12 }}>Débloqués</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 9, marginBottom: 20 }}>
                  {unlocked.map(b => (
                    <BadgeCard key={b.id} badge={b} unlocked />
                  ))}
                </div>
              </>
            )}

            {locked.length > 0 && (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fi)', marginBottom: 12 }}>À débloquer</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 9 }}>
                  {locked.map(b => (
                    <BadgeCard key={b.id} badge={b} unlocked={false} />
                  ))}
                </div>
              </>
            )}

            {allBadges.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--mu)', fontSize: 13 }}>
                Aucun badge configuré pour le moment.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function BadgeCard({ badge, unlocked }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: 14, textAlign: 'center',
      boxShadow: unlocked ? '0 4px 14px rgba(212,255,58,.15)' : 'var(--sh)',
      border: unlocked ? '2px solid var(--fluo)' : '2px solid transparent',
      opacity: unlocked ? 1 : 0.35,
      transition: 'all .2s',
    }}>
      <div style={{ fontSize: 22, marginBottom: 7 }}>{badge.icon || '🏅'}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fi)' }}>{badge.name}</div>
      <div style={{ fontSize: 10, color: 'var(--mu)', marginTop: 2 }}>{badge.description}</div>
    </div>
  )
}

const hdr = { padding: '18px 24px 14px', background: '#fff', borderBottom: '1px solid var(--ln)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, boxShadow: '0 1px 4px rgba(7,40,32,.04)' }
