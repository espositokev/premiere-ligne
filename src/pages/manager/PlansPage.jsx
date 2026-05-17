import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { Avatar } from '../../components/Avatar'
import { formatDate, daysUntil } from '../../lib/utils'
import { IconPlus, IconCheck, IconArrowRight, IconTarget } from '@tabler/icons-react'

export default function PlansPage() {
  const { profile } = useAuth()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (profile?.structure_id) load() }, [profile?.structure_id])

  async function load() {
    const { data: vendeurs } = await supabase.from('profiles')
      .select('id').eq('structure_id', profile.structure_id).eq('role', 'vendeur')
    if (!vendeurs?.length) { setLoading(false); return }
    const ids = vendeurs.map(v => v.id)

    const { data } = await supabase.from('plans')
      .select('*, profiles!vendeur_id(full_name, id), plan_dojos(*, dojos(title))')
      .in('vendeur_id', ids).order('created_at', { ascending: false })
    setPlans(data || [])
    setLoading(false)
  }

  function statusBadge(status) {
    const map = { active: { label: 'En cours', bg: '#DBEAFE', color: '#1E40AF' }, completed: { label: 'Terminé', bg: '#DCFCE7', color: '#166534' }, paused: { label: 'En pause', bg: '#FEF9C3', color: '#854D0E' } }
    return map[status] || map.active
  }

  function stepStatus(pd) {
    if (pd.status === 'done') return 'done'
    if (pd.target_date && new Date(pd.target_date) <= new Date(Date.now() + 86400000 * 2)) return 'current'
    return 'future'
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '18px 24px 14px', background: '#fff', borderBottom: '1px solid var(--ln)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, boxShadow: '0 1px 4px rgba(7,40,32,.04)' }}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 600, color: 'var(--fi)' }}>Plans de montée en compétence</div>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 2 }}>{plans.filter(p => p.status === 'active').length} plans actifs</div>
        </div>
        <button style={btnPrimary}><IconPlus size={15} />Nouveau plan</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--mu)' }}>Chargement…</div>}

        {!loading && plans.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <IconTarget size={48} color="var(--mu)" style={{ marginBottom: 16 }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fi)', marginBottom: 8 }}>Aucun plan de montée</div>
            <div style={{ fontSize: 13, color: 'var(--mu)', marginBottom: 24 }}>
              Créez des plans depuis la Matrice en assignant des Dojos à vos vendeurs.
            </div>
          </div>
        )}

        {plans.map(plan => {
          const st = statusBadge(plan.status)
          const dojos = plan.plan_dojos || []
          return (
            <div key={plan.id} style={{ background: '#fff', borderRadius: 14, boxShadow: 'var(--sh)', overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ background: 'var(--bg)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--ln)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={plan.profiles?.full_name} id={plan.profiles?.id} size={28} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fi)' }}>
                    {plan.profiles?.full_name} — {plan.title}
                  </div>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: st.bg, color: st.color }}>{st.label}</span>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                {plan.objectif && (
                  <div style={{ background: 'linear-gradient(90deg,rgba(11,61,46,.06),transparent)', borderRadius: 9, padding: '10px 12px', fontSize: 12, color: 'var(--fi)', borderLeft: '3px solid var(--forest)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <IconArrowRight size={14} color="var(--forest)" style={{ flexShrink: 0, marginTop: 1 }} />
                    {plan.objectif}
                  </div>
                )}
                {dojos.sort((a, b) => a.order_index - b.order_index).map(pd => {
                  const status = stepStatus(pd)
                  return (
                    <div key={pd.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 9,
                      background: status === 'current' ? '#fff' : 'var(--bg)',
                      border: status === 'current' ? '1.5px solid var(--forest)' : '1.5px solid transparent',
                      boxShadow: status === 'current' ? '0 2px 8px rgba(11,61,46,.08)' : 'none',
                      opacity: status === 'future' ? 0.45 : 1,
                    }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: status === 'done' ? 'var(--forest)' : 'transparent',
                        border: status === 'done' ? '1.5px solid var(--forest)' : '1.5px solid var(--ln)',
                        fontSize: 10,
                        color: status === 'done' ? 'var(--fluo)' : 'transparent',
                      }}>
                        {status === 'done' && <IconCheck size={10} />}
                      </div>
                      <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: status === 'current' ? 'var(--forest)' : 'var(--fi)' }}>
                        {pd.dojos?.title}
                      </div>
                      <div style={{ fontSize: 11, color: status === 'current' ? 'var(--forest)' : 'var(--mu)', fontWeight: status === 'current' ? 700 : 400 }}>
                        {pd.status === 'done' ? `Validé — ${formatDate(pd.updated_at)}` : pd.target_date ? `${formatDate(pd.target_date)} — ${daysUntil(pd.target_date)}` : 'À planifier'}
                      </div>
                    </div>
                  )
                })}
                {dojos.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--mu)', textAlign: 'center', padding: '8px 0' }}>
                    Aucun dojo dans ce plan — assignez des dojos depuis la Matrice
                  </div>
                )}
              </div>
            </div>
          )
        })}
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
