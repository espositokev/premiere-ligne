import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { Avatar } from '../../components/Avatar'

export default function VendeurClassementPage() {
  const { profile } = useAuth()
  const [classement, setClassement] = useState([])
  const [myRank, setMyRank] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (profile?.structure_id) load() }, [profile?.structure_id])

  async function load() {
    const { data: vendeurs } = await supabase.from('profiles')
      .select('id, full_name, xp_total')
      .eq('structure_id', profile.structure_id)
      .eq('role', 'vendeur')

    if (!vendeurs?.length) { setLoading(false); return }
    const ids = vendeurs.map(v => v.id)

    const { data: vDojos } = await supabase.from('vendeur_dojos')
      .select('vendeur_id').in('vendeur_id', ids).eq('status', 'validated')

    const counts = {}
    vDojos?.forEach(vd => { counts[vd.vendeur_id] = (counts[vd.vendeur_id] || 0) + 1 })

    const ranked = vendeurs
      .map(v => ({ ...v, dojos: counts[v.id] || 0 }))
      .sort((a, b) => b.dojos - a.dojos)

    setClassement(ranked)
    setMyRank((ranked.findIndex(v => v.id === profile.id) + 1) || null)
    setLoading(false)
  }

  const rankColors = ['#B45309', '#6B7280', '#92400E']
  const myPos = classement.findIndex(v => v.id === profile.id)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={hdr}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 600, color: 'var(--fi)' }}>Classement équipe</div>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 2 }}>
            {myRank ? `Tu es ${myRank}${myRank === 1 ? 'er' : 'ème'} ce mois — ${myRank === 1 ? 'Excellent !' : 'continue !'}` : 'Commence à valider des Dojos pour apparaître'}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--mu)' }}>Chargement…</div>}

        {!loading && (
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: 'var(--sh)', overflow: 'hidden', maxWidth: 500 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ln)', fontSize: 13, fontWeight: 600, color: 'var(--fi)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              Ce mois-ci <span style={{ fontSize: 11, color: 'var(--mu)', fontWeight: 400 }}>Dojos validés</span>
            </div>

            {classement.length === 0 ? (
              <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--mu)', fontSize: 13 }}>
                Aucun classement disponible
              </div>
            ) : (
              classement.map((v, i) => {
                const isMe = v.id === profile.id
                const maxDojos = classement[0]?.dojos || 1
                const pct = maxDojos > 0 ? Math.round((v.dojos / maxDojos) * 100) : 0
                return (
                  <div key={v.id} style={{
                    display: 'flex', alignItems: 'center', gap: 11,
                    padding: '11px 16px',
                    borderBottom: i < classement.length - 1 ? '1px solid var(--ln)' : 'none',
                    background: isMe ? 'linear-gradient(90deg,rgba(212,255,58,.08),transparent)' : 'transparent',
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 700, width: 20, textAlign: 'center', flexShrink: 0, color: rankColors[i] || 'var(--mu)' }}>
                      {i + 1}
                    </span>
                    <Avatar name={v.full_name} id={v.id} size={28} />
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--fi)' }}>
                      {v.full_name}
                      {isMe && (
                        <span style={{ fontSize: 10, background: 'var(--fluo)', color: 'var(--fi)', padding: '1px 6px', borderRadius: 6, marginLeft: 5, fontWeight: 600 }}>Moi</span>
                      )}
                    </div>
                    <div style={{ width: 75, height: 5, background: 'var(--ln)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,var(--forest),var(--fl))', borderRadius: 10 }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fi)', minWidth: 60, textAlign: 'right' }}>
                      {v.dojos} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--mu)' }}>dojos</span>
                    </span>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const hdr = { padding: '18px 24px 14px', background: '#fff', borderBottom: '1px solid var(--ln)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, boxShadow: '0 1px 4px rgba(7,40,32,.04)' }
