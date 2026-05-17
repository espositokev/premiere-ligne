import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatDate, daysUntil } from '../../lib/utils'
import { IconFlame, IconBook2, IconBolt, IconMedal, IconUser, IconDownload } from '@tabler/icons-react'

export default function VendeurHomePage() {
  const { profile } = useAuth()
  const [data, setData] = useState({ dojosValides: 0, dojosObjectif: 12, prochain: null, defi: null, badges: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (profile?.id) load() }, [profile?.id])

  async function load() {
    const [{ data: vd, count: dvCount }, { data: vb }, { data: defis }] = await Promise.all([
      supabase.from('vendeur_dojos').select('*, dojos(title)', { count: 'exact' })
        .eq('vendeur_id', profile.id).eq('status', 'validated'),
      supabase.from('vendeur_badges').select('id', { count: 'exact' }).eq('vendeur_id', profile.id),
      supabase.from('defis').select('*, defi_participations(vendeur_id, progress, completed)')
        .eq('structure_id', profile.structure_id).order('created_at', { ascending: false }).limit(1),
    ])

    // Prochain dojo assigné
    const { data: nextDojos } = await supabase.from('vendeur_dojos')
      .select('*, dojos(title), plan_dojos!inner(target_date)')
      .eq('vendeur_id', profile.id).eq('status', 'assigned')
      .order('plan_dojos.target_date').limit(1)

    const prochain = nextDojos?.[0] || null
    const defi = defis?.[0] || null
    const myParticipation = defi?.defi_participations?.find(p => p.vendeur_id === profile.id)

    setData({
      dojosValides: dvCount || 0,
      dojosObjectif: 12,
      prochain,
      defi: defi ? { ...defi, myProgress: myParticipation?.progress || 0, myCompleted: myParticipation?.completed } : null,
      badges: vb?.length || 0,
    })
    setLoading(false)
  }

  const firstName = profile?.full_name?.split(' ')[0] || ''
  const pct = Math.min(100, Math.round((data.dojosValides / data.dojosObjectif) * 100))
  const managerName = profile?.structures?.name || 'votre manager'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={hdr}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 600, color: 'var(--fi)' }}>Bonjour, {firstName} 👋</div>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 2 }}>
            {profile?.streak > 0 ? `${profile.streak} jours de streak — continue sur ta lancée !` : 'Bienvenue sur ta plateforme de formation'}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--mu)' }}>Chargement…</div>}
        {!loading && (
          <>
            {/* Hero */}
            <div style={{ background: 'linear-gradient(135deg,#072820,#0B3D2E 60%,#1a5c42)', borderRadius: 14, padding: '20px 22px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 20, boxShadow: 'var(--shm)' }}>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 3 }}>
                  {data.dojosValides} Dojo{data.dojosValides > 1 ? 's' : ''} validé{data.dojosValides > 1 ? 's' : ''}
                </h2>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>Chaque Dojo validé compte — continue sur ta lancée</p>
                <div style={{ marginTop: 12, maxWidth: 290 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,.4)', marginBottom: 5 }}>
                    <span>{data.dojosValides} Dojos validés</span>
                    <span>Objectif : {data.dojosObjectif} ce mois</span>
                  </div>
                  <div style={{ height: 7, background: 'rgba(255,255,255,.12)', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--fluo)', borderRadius: 10, width: `${pct}%`, transition: 'width .5s' }} />
                  </div>
                </div>
              </div>
              <div style={{ background: 'var(--fluo)', borderRadius: 12, padding: '14px 18px', textAlign: 'center', minWidth: 84, boxShadow: '0 4px 12px rgba(212,255,58,.3)' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--fi)', lineHeight: 1 }}>{data.dojosValides}</div>
                <div style={{ fontSize: 10, color: 'var(--forest)', fontWeight: 600, marginTop: 3, lineHeight: 1.3 }}>Dojos<br />validés</div>
              </div>
            </div>

            {/* Métriques */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 18 }}>
              {[
                { icon: IconFlame, color: '#F97316', bg: '#FEF3C7', val: profile?.streak || 0, label: 'Jours streak' },
                { icon: IconBook2, color: '#16A34A', bg: '#DCFCE7', val: data.dojosValides, label: 'Dojos validés' },
                { icon: IconBolt, color: '#2563EB', bg: '#DBEAFE', val: profile?.xp_total || 0, label: 'Points XP' },
                { icon: IconMedal, color: '#9333EA', bg: '#F3E8FF', val: data.badges, label: 'Badges' },
              ].map(m => (
                <div key={m.label} style={{ background: '#fff', borderRadius: 12, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 11, boxShadow: 'var(--sh)' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <m.icon size={19} color={m.color} />
                  </div>
                  <div>
                    <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--fi)', lineHeight: 1 }}>{m.val}</div>
                    <div style={{ fontSize: 10, color: 'var(--mu)', marginTop: 2 }}>{m.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Two cols */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {/* Prochain dojo */}
              <div style={{ background: '#fff', borderRadius: 14, boxShadow: 'var(--sh)', overflow: 'hidden' }}>
                <div style={{ background: 'linear-gradient(135deg,var(--forest),var(--fl))', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,.6)' }}>Prochain Dojo</div>
                  {data.prochain?.plan_dojos?.[0]?.target_date && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fluo)' }}>
                      {formatDate(data.prochain.plan_dojos[0].target_date)} — {daysUntil(data.prochain.plan_dojos[0].target_date)}
                    </div>
                  )}
                </div>
                <div style={{ padding: '15px 16px' }}>
                  {data.prochain ? (
                    <>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fi)', marginBottom: 4 }}>
                        {data.prochain.dojos?.title}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--mu)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                        <IconUser size={14} />Avec {managerName}
                      </div>
                      <button style={{ background: 'var(--forest)', color: 'var(--fluo)', border: 'none', padding: '9px 17px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <IconDownload size={15} />Télécharger le Dojo
                      </button>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--mu)', fontSize: 13 }}>
                      Aucun Dojo planifié pour le moment
                    </div>
                  )}
                </div>
              </div>

              {/* Défi */}
              {data.defi ? (
                <div style={{ background: 'linear-gradient(135deg,#072820,#0B3D2E 60%,#1a5c42)', borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 18, boxShadow: 'var(--shm)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ background: 'var(--fluo)', color: 'var(--fi)', fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 8, display: 'inline-block', marginBottom: 9 }}>Défi de la semaine</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 3 }}>{data.defi.title}</div>
                    {data.defi.description && <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>{data.defi.description}</div>}
                    <div style={{ marginTop: 10 }}>
                      <div style={{ height: 5, background: 'rgba(255,255,255,.15)', borderRadius: 10, overflow: 'hidden', marginBottom: 5 }}>
                        <div style={{ height: '100%', background: 'var(--fluo)', borderRadius: 10, width: `${data.defi.myProgress}%` }} />
                      </div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>Ma progression : {data.defi.myProgress}%</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: 56 }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--fluo)' }}>+{data.defi.xp_reward}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>XP</div>
                  </div>
                </div>
              ) : (
                <div style={{ background: '#fff', borderRadius: 14, boxShadow: 'var(--sh)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                  <div style={{ textAlign: 'center', color: 'var(--mu)', fontSize: 13 }}>Aucun défi actif cette semaine</div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const hdr = { padding: '18px 24px 14px', background: '#fff', borderBottom: '1px solid var(--ln)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, boxShadow: '0 1px 4px rgba(7,40,32,.04)' }
