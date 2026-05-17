import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatDate, daysUntil } from '../../lib/utils'
import { IconCheck } from '@tabler/icons-react'

export default function VendeurDojosPage() {
  const { profile } = useAuth()
  const [dojos, setDojos] = useState([])
  const [loading, setLoading] = useState(true)
  const [managerName, setManagerName] = useState('')

  useEffect(() => { if (profile?.id) load() }, [profile?.id])

  async function load() {
    const [{ data }, { data: mgr }] = await Promise.all([
      supabase.from('vendeur_dojos')
        .select('*, dojos(title, competences(title))')
        .eq('vendeur_id', profile.id)
        .order('assigned_at', { ascending: false }),
      supabase.from('profiles').select('full_name').eq('structure_id', profile.structure_id).eq('role', 'manager').single(),
    ])
    setDojos(data || [])
    setManagerName(mgr?.full_name || 'votre manager')
    setLoading(false)
  }

  const aVenir = dojos.filter(d => d.status === 'assigned' || d.status === 'in_progress')
  const valides = dojos.filter(d => d.status === 'validated')

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={hdr}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 600, color: 'var(--fi)' }}>Mes Dojos</div>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 2 }}>
            {valides.length} validé{valides.length > 1 ? 's' : ''} par {managerName} — {aVenir.length} à venir
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--mu)' }}>Chargement…</div>}

        {!loading && dojos.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--mu)', fontSize: 13 }}>
            Aucun Dojo assigné pour le moment — ton manager va bientôt en planifier.
          </div>
        )}

        {aVenir.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mu)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 9 }}>À venir</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 18 }}>
              {aVenir.map(d => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 9, background: '#fff', border: '1.5px solid var(--forest)', boxShadow: '0 2px 8px rgba(11,61,46,.08)' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', border: '1.5px solid var(--forest)', flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--forest)' }}>
                    {d.dojos?.title}
                    {d.dojos?.competences?.title && (
                      <span style={{ fontSize: 10, color: 'var(--mu)', fontWeight: 400, marginLeft: 6 }}>· {d.dojos.competences.title}</span>
                    )}
                  </div>
                  <span style={{ display: 'inline-flex', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#DBEAFE', color: '#1E40AF' }}>
                    Assigné
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {valides.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mu)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 9 }}>
              Validés par {managerName}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {valides.map(d => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 9, background: 'var(--bg)' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--forest)', border: '1.5px solid var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <IconCheck size={10} color="var(--fluo)" />
                  </div>
                  <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--fi)' }}>
                    {d.dojos?.title}
                    {d.dojos?.competences?.title && (
                      <span style={{ fontSize: 10, color: 'var(--mu)', fontWeight: 400, marginLeft: 6 }}>· {d.dojos.competences.title}</span>
                    )}
                  </div>
                  <span style={{ display: 'inline-flex', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#DCFCE7', color: '#166534' }}>
                    Validé — {formatDate(d.validated_at)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const hdr = { padding: '18px 24px 14px', background: '#fff', borderBottom: '1px solid var(--ln)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, boxShadow: '0 1px 4px rgba(7,40,32,.04)' }
