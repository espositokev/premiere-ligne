import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatDate, daysUntil } from '../../lib/utils'
import { IconCalendar, IconCheck, IconTarget } from '@tabler/icons-react'

export default function VendeurPlanPage() {
  const { profile } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [managerName, setManagerName] = useState('')

  useEffect(() => { if (profile?.id) load() }, [profile?.id])

  async function load() {
    const [{ data: s }, { data: mgr }] = await Promise.all([
      supabase.from('coaching_sessions')
        .select('*, dojos!dojo_id(titre), sous_competences!sous_comp_id(title)')
        .eq('vendeur_id', profile.id)
        .order('scheduled_date', { ascending: false }),
      supabase.from('profiles')
        .select('full_name')
        .eq('structure_id', profile.structure_id)
        .eq('role', 'manager')
        .single(),
    ])
    setSessions(s || [])
    setManagerName(mgr?.full_name || 'votre manager')
    setLoading(false)
  }

  const today = new Date().toISOString().split('T')[0]
  const upcoming = sessions.filter(s => s.status === 'planned' && s.scheduled_date >= today)
  const past = sessions.filter(s => s.status === 'validated' || s.scheduled_date < today)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={hdr}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 600, color: 'var(--fi)' }}>Mes sessions de coaching</div>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 2 }}>
            Planifiées avec {managerName}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--mu)' }}>Chargement…</div>}

        {!loading && sessions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <IconTarget size={48} color="var(--mu)" style={{ marginBottom: 16 }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fi)', marginBottom: 8 }}>
              Aucune session planifiée
            </div>
            <div style={{ fontSize: 13, color: 'var(--mu)' }}>
              {managerName} planifiera des sessions de coaching après votre évaluation.
            </div>
          </div>
        )}

        {upcoming.length > 0 && (
          <>
            <SectionTitle>À venir</SectionTitle>
            {upcoming.map(s => <SessionCard key={s.id} session={s} />)}
          </>
        )}

        {past.length > 0 && (
          <>
            <SectionTitle>Historique</SectionTitle>
            {past.map(s => <SessionCard key={s.id} session={s} past />)}
          </>
        )}
      </div>
    </div>
  )
}

function SessionCard({ session: s, past }) {
  const isValidated = s.status === 'validated'
  const borderColor = isValidated ? '#22C55E' : past ? '#F59E0B' : 'var(--forest)'

  return (
    <div style={{
      background: '#fff', borderRadius: 12, boxShadow: 'var(--sh)',
      padding: '13px 16px', display: 'flex', gap: 12, alignItems: 'center',
      marginBottom: 8, borderLeft: `3px solid ${borderColor}`,
      opacity: past && !isValidated ? 0.65 : 1,
    }}>
      <div style={{ textAlign: 'center', minWidth: 38, flexShrink: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1, color: isValidated ? '#22C55E' : past ? '#D97706' : 'var(--forest)' }}>
          {new Date(s.scheduled_date + 'T00:00:00').getDate()}
        </div>
        <div style={{ fontSize: 10, color: 'var(--mu)', textTransform: 'uppercase' }}>
          {new Date(s.scheduled_date + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'short' })}
        </div>
      </div>

      <div style={{ width: 1, height: 32, background: 'var(--ln)', flexShrink: 0 }} />

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fi)', marginBottom: 3 }}>
          {s.sous_competences?.title || s.dojos?.titre || 'Session de coaching'}
        </div>
        {s.notes && <div style={{ fontSize: 11, color: 'var(--mu)' }}>{s.notes}</div>}
        {s.objectif && (
          <div style={{ fontSize: 11, color: 'var(--mu)', fontStyle: 'italic', marginTop: 3 }}>
            🎯 {s.objectif}
          </div>
        )}
        {s.objectif && isValidated && (
          <div style={{ marginTop: 5 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 600,
              background: s.objectif_atteint ? '#DCFCE7' : '#FEF3C7',
              color: s.objectif_atteint ? '#166534' : '#92400E',
            }}>
              {s.objectif_atteint ? '✓ Objectif atteint' : '⏳ En attente'}
            </span>
          </div>
        )}
      </div>

      <div style={{ flexShrink: 0 }}>
        {isValidated ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#DCFCE7', color: '#166534' }}>
            <IconCheck size={12} /> Validée
          </span>
        ) : (
          <span style={{ fontSize: 11, fontWeight: 500, color: past ? '#D97706' : 'var(--forest)' }}>
            {daysUntil(s.scheduled_date)}
          </span>
        )}
      </div>
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 8, marginTop: 4 }}>
      {children}
    </div>
  )
}

const hdr = {
  padding: '18px 24px 14px', background: '#fff', borderBottom: '1px solid var(--ln)',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  flexShrink: 0, boxShadow: '0 1px 4px rgba(7,40,32,.04)',
}
