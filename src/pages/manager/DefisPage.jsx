import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { Avatar } from '../../components/Avatar'
import { formatDate } from '../../lib/utils'
import { IconPlus, IconBolt, IconX } from '@tabler/icons-react'

export default function DefisPage() {
  const { profile } = useAuth()
  const [defis, setDefis] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', xp_reward: 50, start_date: '', end_date: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (profile?.structure_id) load() }, [profile?.structure_id])

  async function load() {
    const { data } = await supabase
      .from('defis')
      .select('*, defi_participations(vendeur_id, progress, completed)')
      .eq('structure_id', profile.structure_id)
      .order('created_at', { ascending: false })
    setDefis(data || [])
    setLoading(false)
  }

  async function createDefi() {
    if (!form.title.trim()) return
    setSaving(true)
    await supabase.from('defis').insert({
      ...form,
      structure_id: profile.structure_id,
      created_by: profile.id,
    })
    setSaving(false)
    setModal(false)
    setForm({ title: '', description: '', xp_reward: 50, start_date: '', end_date: '' })
    load()
  }

  function isActive(defi) {
    const now = new Date()
    const start = defi.start_date ? new Date(defi.start_date) : null
    const end = defi.end_date ? new Date(defi.end_date) : null
    if (!start && !end) return true
    if (start && now < start) return false
    if (end && now > end) return false
    return true
  }

  function daysLeft(defi) {
    if (!defi.end_date) return null
    const diff = Math.ceil((new Date(defi.end_date) - new Date()) / 86400000)
    if (diff <= 0) return 'Terminé'
    return `${diff} jour${diff > 1 ? 's' : ''} restant${diff > 1 ? 's' : ''}`
  }

  const actifs = defis.filter(isActive)
  const passes = defis.filter(d => !isActive(d))

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={headerStyle}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 600, color: 'var(--fi)' }}>Défis équipe</div>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 2 }}>Défis comportementaux hebdomadaires</div>
        </div>
        <button onClick={() => setModal(true)} style={btnPrimary}>
          <IconPlus size={15} />Créer un défi
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--mu)' }}>Chargement…</div>}

        {!loading && defis.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <IconBolt size={48} color="var(--mu)" style={{ marginBottom: 16 }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fi)', marginBottom: 8 }}>Aucun défi créé</div>
            <div style={{ fontSize: 13, color: 'var(--mu)', marginBottom: 24 }}>
              Créez des défis hebdomadaires pour motiver votre équipe et suivre les comportements.
            </div>
            <button onClick={() => setModal(true)} style={btnPrimary}>
              <IconPlus size={15} />Créer le premier défi
            </button>
          </div>
        )}

        {actifs.map(defi => {
          const participants = defi.defi_participations || []
          const completed = participants.filter(p => p.completed).length
          const total = participants.length
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0

          return (
            <div key={defi.id} style={{
              background: 'linear-gradient(135deg,#072820,#0B3D2E 60%,#1a5c42)',
              borderRadius: 14, padding: '18px 20px',
              display: 'flex', alignItems: 'center', gap: 18,
              marginBottom: 20, boxShadow: 'var(--shm)',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ background: 'var(--fluo)', color: 'var(--fi)', fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 8, display: 'inline-block', marginBottom: 9 }}>
                  Actif{defi.end_date ? ` — ${daysLeft(defi)}` : ''}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 3 }}>{defi.title}</div>
                {defi.description && (
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginBottom: 10 }}>{defi.description}</div>
                )}
                <div style={{ marginTop: 10 }}>
                  <div style={{ height: 5, background: 'rgba(255,255,255,.15)', borderRadius: 10, overflow: 'hidden', marginBottom: 5 }}>
                    <div style={{ height: '100%', background: 'var(--fluo)', borderRadius: 10, width: `${pct}%`, transition: 'width .5s' }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>
                    {total > 0 ? `${completed}/${total} membres` : 'Aucune participation encore'}
                    {defi.end_date ? ` — ${daysLeft(defi)}` : ''}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'center', minWidth: 56 }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--fluo)' }}>+{defi.xp_reward}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>points XP</div>
              </div>
            </div>
          )
        })}

        {passes.length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fi)', marginBottom: 12, marginTop: 4 }}>Défis passés</div>
            {passes.map(defi => {
              const participants = defi.defi_participations || []
              const completed = participants.filter(p => p.completed).length
              return (
                <div key={defi.id} style={{ background: '#fff', borderRadius: 14, padding: 16, boxShadow: 'var(--sh)', opacity: 0.6, marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--mu)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 7 }}>
                    {defi.start_date ? formatDate(defi.start_date) : ''} — {defi.end_date ? formatDate(defi.end_date) : ''}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fi)', marginBottom: 3 }}>{defi.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--mu)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {participants.length > 0 ? `${completed}/${participants.length} membres` : 'Aucune participation'}
                    {completed === participants.length && participants.length > 0 && (
                      <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#DCFCE7', color: '#166534', marginLeft: 4 }}>Complété</span>
                    )}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Modal Créer défi */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,40,32,.35)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}
          onClick={() => setModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: 440, boxShadow: '0 16px 48px rgba(7,40,32,.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fi)' }}>Nouveau défi équipe</div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mu)' }}><IconX size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Titre du défi *', key: 'title', placeholder: 'ex : Teaser le Fi sur 100% des RDV' },
                { label: 'Description', key: 'description', placeholder: 'Ce que le vendeur doit faire concrètement…', textarea: true },
              ].map(f => (
                <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fi)' }}>{f.label}</label>
                  {f.textarea
                    ? <textarea value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={{ ...inputSt, height: 72, resize: 'none' }} />
                    : <input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={inputSt} />
                  }
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fi)' }}>XP</label>
                  <input type="number" value={form.xp_reward} onChange={e => setForm(p => ({ ...p, xp_reward: parseInt(e.target.value) || 0 }))} style={inputSt} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fi)' }}>Début</label>
                  <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} style={inputSt} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fi)' }}>Fin</label>
                  <input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} style={inputSt} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setModal(false)} style={{ padding: '9px 16px', borderRadius: 9, border: '1px solid var(--ln)', background: '#fff', fontSize: 13, cursor: 'pointer' }}>Annuler</button>
              <button onClick={createDefi} disabled={saving} style={{ ...btnPrimary, boxShadow: 'none' }}>
                {saving ? 'Création…' : 'Créer le défi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const headerStyle = { padding: '18px 24px 14px', background: '#fff', borderBottom: '1px solid var(--ln)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, boxShadow: '0 1px 4px rgba(7,40,32,.04)' }
const btnPrimary = { background: 'var(--forest)', color: 'var(--fluo)', border: 'none', padding: '9px 17px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(11,61,46,.2)' }
const inputSt = { padding: '9px 12px', borderRadius: 9, border: '1px solid var(--ln)', fontSize: 13, background: 'var(--bg)', fontFamily: 'inherit', width: '100%' }
