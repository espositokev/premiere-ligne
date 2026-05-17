import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatDate, daysUntil } from '../../lib/utils'
import { IconTarget, IconArrowRight, IconCheck } from '@tabler/icons-react'

export default function VendeurPlanPage() {
  const { profile } = useAuth()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [managerName, setManagerName] = useState('')

  useEffect(() => { if (profile?.id) load() }, [profile?.id])

  async function load() {
    const [{ data }, { data: mgr }] = await Promise.all([
      supabase.from('plans')
        .select('*, plan_dojos(*, dojos(title))')
        .eq('vendeur_id', profile.id)
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('full_name').eq('structure_id', profile.structure_id).eq('role', 'manager').single(),
    ])
    setPlans(data || [])
    setManagerName(mgr?.full_name || 'votre manager')
    setLoading(false)
  }

  function stepStatus(pd) {
    if (pd.status === 'done') return 'done'
    if (pd.target_date && new Date(pd.target_date) <= new Date(Date.now() + 86400000 * 2)) return 'current'
    return 'future'
  }

  const activePlan = plans.find(p => p.status === 'active')
  const donePlans = plans.filter(p => p.status !== 'active')

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={hdr}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 600, color: 'var(--fi)' }}>Mon plan de montée</div>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 2 }}>
            Défini avec {managerName}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--mu)' }}>Chargement…</div>}

        {!loading && plans.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <IconTarget size={48} color="var(--mu)" style={{ marginBottom: 16 }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fi)', marginBottom: 8 }}>Aucun plan défini</div>
            <div style={{ fontSize: 13, color: 'var(--mu)' }}>
              {managerName} définira ton plan de montée en compétence après ton évaluation.
            </div>
          </div>
        )}

        {activePlan && (
          <>
            {/* Objectif card */}
            <div style={{ background: 'linear-gradient(90deg,rgba(11,61,46,.07),transparent)', borderRadius: 12, padding: '14px 16px', marginBottom: 16, borderLeft: '4px solid var(--forest)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <IconTarget size={20} color="var(--forest)" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fi)' }}>Plan actif : {activePlan.title}</div>
                {activePlan.objectif && <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 2 }}>{activePlan.objectif}</div>}
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 14, boxShadow: 'var(--sh)', overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ background: 'var(--bg)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--ln)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fi)' }}>Mes Dojos planifiés</div>
                <span style={{ display: 'inline-flex', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#DBEAFE', color: '#1E40AF' }}>
                  {(activePlan.plan_dojos || []).filter(pd => pd.status === 'done').length} / {(activePlan.plan_dojos || []).length} validés
                </span>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                {(activePlan.plan_dojos || []).sort((a, b) => a.order_index - b.order_index).map(pd => {
                  const status = stepStatus(pd)
                  return (
                    <div key={pd.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 9,
                      background: status === 'current' ? '#fff' : 'var(--bg)',
                      border: status === 'current' ? '1.5px solid var(--forest)' : '1.5px solid transparent',
                      boxShadow: status === 'current' ? '0 2px 8px rgba(11,61,46,.08)' : 'none',
                      opacity: status === 'future' ? 0.45 : 1,
                    }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: status === 'done' ? 'var(--forest)' : 'transparent', border: `1.5px solid ${status === 'done' ? 'var(--forest)' : 'var(--ln)'}` }}>
                        {status === 'done' && <IconCheck size={10} color="var(--fluo)" />}
                      </div>
                      <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: status === 'current' ? 'var(--forest)' : 'var(--fi)' }}>
                        {pd.dojos?.title}
                      </div>
                      <div style={{ fontSize: 11, color: status === 'current' ? 'var(--forest)' : 'var(--mu)', fontWeight: status === 'current' ? 700 : 400 }}>
                        {pd.status === 'done'
                          ? `Validé par ${managerName} — ${formatDate(pd.updated_at)}`
                          : pd.target_date ? `${formatDate(pd.target_date)} — ${daysUntil(pd.target_date)}` : `À planifier avec ${managerName}`}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {activePlan.objectif && (
              <div style={{ background: '#fff', borderRadius: 12, padding: '15px 16px', boxShadow: 'var(--sh)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fi)', marginBottom: 10 }}>Ce que je vais changer dans mon geste</div>
                <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--fi)', alignItems: 'flex-start' }}>
                  <IconArrowRight size={14} color="var(--forest)" style={{ flexShrink: 0, marginTop: 1 }} />
                  {activePlan.objectif}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const hdr = { padding: '18px 24px 14px', background: '#fff', borderBottom: '1px solid var(--ln)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, boxShadow: '0 1px 4px rgba(7,40,32,.04)' }
