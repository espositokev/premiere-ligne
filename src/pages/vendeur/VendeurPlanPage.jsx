import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatDate } from '../../lib/utils'
import { IconCheck, IconTarget, IconBook2 } from '@tabler/icons-react'

function sessionStatus(s) {
  if (s.objectif_atteint) return 'terminee'
  if (s.dojo_realise) return 'en_cours'
  return 'planifiee'
}

const STATUS = {
  planifiee: { label: 'Planifiée', bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' },
  en_cours:  { label: 'En cours',  bg: '#FEF3C7', color: '#D97706', border: '#FDE68A' },
  terminee:  { label: 'Terminée',  bg: '#DCFCE7', color: '#166534', border: '#BBF7D0' },
}

export default function VendeurPlanPage() {
  const { profile } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [managerName, setManagerName] = useState('')

  useEffect(() => { if (profile?.id) load() }, [profile?.id])

  async function load() {
    const [{ data: rawSessions }, { data: mgr }, { data: dojoData }, { data: scData }] = await Promise.all([
      supabase.from('coaching_sessions').select('*').eq('vendeur_id', profile.id).order('scheduled_date', { ascending: false }),
      supabase.from('profiles').select('full_name').eq('structure_id', profile.structure_id).eq('role', 'manager').single(),
      supabase.from('dojos').select('id, title').eq('structure_id', profile.structure_id),
      supabase.from('sous_competences').select('id, title'),
    ])
    const dojoMap = {}
    ;(dojoData || []).forEach(d => { dojoMap[d.id] = d })
    const scMap = {}
    ;(scData || []).forEach(sc => { scMap[sc.id] = sc })
    const enriched = (rawSessions || []).map(s => ({
      ...s,
      dojos: s.dojo_id ? (dojoMap[s.dojo_id] || null) : null,
      sous_competences: s.sous_comp_id ? (scMap[s.sous_comp_id] || null) : null,
    }))
    setSessions(enriched)
    setManagerName(mgr?.full_name || 'votre manager')
    setLoading(false)
  }

  const enCours  = sessions.filter(s => sessionStatus(s) === 'en_cours')
  const planifiees = sessions.filter(s => sessionStatus(s) === 'planifiee')
  const terminees = sessions.filter(s => sessionStatus(s) === 'terminee')

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={hdr}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 600, color: 'var(--fi)' }}>Mes sessions de coaching</div>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 2 }}>
            Planifiées avec {managerName} — {terminees.length} terminée{terminees.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--mu)' }}>Chargement…</div>}

        {!loading && sessions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <IconTarget size={48} color="var(--mu)" style={{ marginBottom: 16 }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fi)', marginBottom: 8 }}>Aucune session planifiée</div>
            <div style={{ fontSize: 13, color: 'var(--mu)' }}>
              {managerName} planifiera des sessions de coaching après votre évaluation.
            </div>
          </div>
        )}

        {enCours.length > 0 && (
          <>
            <SectionTitle>En cours</SectionTitle>
            {enCours.map(s => <SessionCard key={s.id} session={s} />)}
          </>
        )}

        {planifiees.length > 0 && (
          <>
            <SectionTitle>Planifiées</SectionTitle>
            {planifiees.map(s => <SessionCard key={s.id} session={s} />)}
          </>
        )}

        {terminees.length > 0 && (
          <>
            <SectionTitle>Terminées</SectionTitle>
            {terminees.map(s => <SessionCard key={s.id} session={s} />)}
          </>
        )}
      </div>
    </div>
  )
}

function SessionCard({ session: s }) {
  const st = sessionStatus(s)
  const cfg = STATUS[st]

  return (
    <div style={{
      background: '#fff', borderRadius: 12, boxShadow: 'var(--sh)',
      padding: '13px 16px', marginBottom: 8,
      borderLeft: `3px solid ${cfg.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ textAlign: 'center', minWidth: 38, flexShrink: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1, color: cfg.color }}>
            {new Date(s.scheduled_date + 'T00:00:00').getDate()}
          </div>
          <div style={{ fontSize: 10, color: 'var(--mu)', textTransform: 'uppercase' }}>
            {new Date(s.scheduled_date + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'short' })}
          </div>
        </div>

        <div style={{ width: 1, height: 32, background: 'var(--ln)', flexShrink: 0 }} />

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 2 }}>
            {s.dojos?.title && (
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#DBEAFE', color: '#1E40AF', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <IconBook2 size={10} />{s.dojos.title}
              </span>
            )}
            {s.sous_competences?.title && (
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--bg)', color: 'var(--fi)', fontWeight: 500 }}>
                {s.sous_competences.title}
              </span>
            )}
            {!s.dojos?.title && !s.sous_competences?.title && (
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fi)' }}>Session de coaching</span>
            )}
          </div>
          {s.objectif && (
            <div style={{ fontSize: 11, color: 'var(--mu)', fontStyle: 'italic' }}>🎯 {s.objectif}</div>
          )}
        </div>

        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: cfg.bg, color: cfg.color, flexShrink: 0 }}>
          {cfg.label}
        </span>
      </div>

      {/* Indicateurs de phases */}
      <div style={{ display: 'flex', gap: 8, marginTop: 10, marginLeft: 62, flexWrap: 'wrap' }}>
        <PhaseIndicator number={1} label="Dojo réalisé" done={s.dojo_realise} doneAt={s.dojo_realise_at} />
        {s.dojo_realise && (
          <PhaseIndicator number={2} label="Objectif atteint" done={s.objectif_atteint} doneAt={s.objectif_atteint_at} />
        )}
      </div>
    </div>
  )
}

function PhaseIndicator({ number, label, done, doneAt }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 9px', borderRadius: 8,
      background: done ? 'rgba(220,252,231,.6)' : 'var(--bg)',
      border: `1px solid ${done ? '#BBF7D0' : 'var(--ln)'}`,
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 700,
        background: done ? 'var(--forest)' : 'transparent',
        color: done ? 'var(--fluo)' : 'var(--mu)',
        border: done ? 'none' : '1.5px solid var(--ln)',
      }}>
        {done ? <IconCheck size={9} /> : number}
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: done ? '#166534' : 'var(--mu)' }}>
        {label}
        {done && doneAt && <span style={{ fontWeight: 400, marginLeft: 4 }}>— {formatDate(doneAt)}</span>}
      </span>
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
