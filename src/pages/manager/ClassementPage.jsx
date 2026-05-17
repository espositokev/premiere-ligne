import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { Avatar } from '../../components/Avatar'
import { IconTrophy } from '@tabler/icons-react'

export default function ClassementPage() {
  const { profile } = useAuth()
  const [classement, setClassement] = useState([])
  const [defi, setDefi] = useState(null)
  const [periode, setPeriode] = useState('mois')
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (profile?.structure_id) load() }, [profile?.structure_id, periode])

  async function load() {
    const { data: vendeurs } = await supabase.from('profiles')
      .select('id, full_name, poste, xp_total')
      .eq('structure_id', profile.structure_id)
      .eq('role', 'vendeur')

    if (!vendeurs?.length) { setLoading(false); return }

    const ids = vendeurs.map(v => v.id)

    // Compter les dojos validés
    const { data: vDojos } = await supabase.from('vendeur_dojos')
      .select('vendeur_id')
      .in('vendeur_id', ids)
      .eq('status', 'validated')

    const dojoCounts = {}
    vDojos?.forEach(vd => { dojoCounts[vd.vendeur_id] = (dojoCounts[vd.vendeur_id] || 0) + 1 })

    const ranked = vendeurs
      .map(v => ({ ...v, dojos: dojoCounts[v.id] || 0 }))
      .sort((a, b) => b.dojos - a.dojos || b.xp_total - a.xp_total)

    setClassement(ranked)

    // Défi actif
    const { data: defis } = await supabase.from('defis')
      .select('*, defi_participations(vendeur_id, completed)')
      .eq('structure_id', profile.structure_id)
      .order('created_at', { ascending: false })
      .limit(1)
    if (defis?.length) setDefi(defis[0])

    setLoading(false)
  }

  const rankColors = ['#B45309', '#6B7280', '#92400E']

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={hdr}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 600, color: 'var(--fi)' }}>Classement équipe</div>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 2 }}>Basé sur les Dojos validés par le manager</div>
        </div>
        <select value={periode} onChange={e => setPeriode(e.target.value)}
          style={{ fontSize: 12, padding: '7px 11px', borderRadius: 9, border: '1px solid var(--ln)', background: '#fff' }}>
          <option value="mois">Ce mois</option>
          <option value="semaine">Cette semaine</option>
          <option value="annee">Cette année</option>
        </select>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--mu)' }}>Chargement…</div>}

        {!loading && classement.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <IconTrophy size={48} color="var(--mu)" style={{ marginBottom: 16 }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fi)', marginBottom: 8 }}>Aucun vendeur à classer</div>
            <div style={{ fontSize: 13, color: 'var(--mu)' }}>Ajoutez des vendeurs et validez des Dojos pour voir le classement.</div>
          </div>
        )}

        {!loading && classement.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* Classement */}
            <div style={{ background: '#fff', borderRadius: 14, boxShadow: 'var(--sh)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ln)', fontSize: 13, fontWeight: 600, color: 'var(--fi)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                Classement général <span style={{ fontSize: 11, color: 'var(--mu)', fontWeight: 400 }}>Dojos validés</span>
              </div>
              {classement.map((v, i) => {
                const maxDojos = classement[0]?.dojos || 1
                const pct = maxDojos > 0 ? Math.round((v.dojos / maxDojos) * 100) : 0
                return (
                  <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 16px', borderBottom: i < classement.length - 1 ? '1px solid var(--ln)' : 'none', background: v.id === profile?.id ? 'linear-gradient(90deg,rgba(212,255,58,.08),transparent)' : 'transparent' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, width: 20, textAlign: 'center', flexShrink: 0, color: rankColors[i] || 'var(--mu)' }}>
                      {i + 1}
                    </span>
                    <Avatar name={v.full_name} id={v.id} size={28} />
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--fi)' }}>
                      {v.full_name}
                      {v.id === profile?.id && (
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
              })}
            </div>

            {/* Défi actif */}
            {defi && (
              <div style={{ background: 'linear-gradient(135deg,#072820,#0B3D2E 60%,#1a5c42)', borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 18, alignSelf: 'flex-start', boxShadow: 'var(--shm)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ background: 'var(--fluo)', color: 'var(--fi)', fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 8, display: 'inline-block', marginBottom: 9 }}>Défi actif</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 3 }}>{defi.title}</div>
                  <div style={{ marginTop: 10 }}>
                    <div style={{ height: 5, background: 'rgba(255,255,255,.15)', borderRadius: 10, overflow: 'hidden', marginBottom: 5 }}>
                      <div style={{ height: '100%', background: 'var(--fluo)', borderRadius: 10, width: '60%' }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>
                      {defi.defi_participations?.filter(p => p.completed).length}/{defi.defi_participations?.length || 0} membres l'ont relevé
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'center', minWidth: 56 }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--fluo)' }}>+{defi.xp_reward}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>XP</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const hdr = { padding: '18px 24px 14px', background: '#fff', borderBottom: '1px solid var(--ln)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, boxShadow: '0 1px 4px rgba(7,40,32,.04)' }
