import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  IconPlus, IconX, IconDownload, IconTrash,
  IconPencil, IconClock, IconBook2,
} from '@tabler/icons-react'

export default function BibliothequePage() {
  const { profile } = useAuth()
  const isAdmin   = profile?.is_admin === true
  const isManager = profile?.role === 'manager' || isAdmin

  const [comps,    setComps]    = useState([])
  const [allComps, setAllComps] = useState([])
  const [loading,  setLoading]  = useState(true)

  const [modal,    setModal]    = useState(null) // null | 'add' | { type:'edit', dojo }
  const [form,     setForm]     = useState({ titre: '', objectif: '', duree: '', competenceId: '' })
  const [file,     setFile]     = useState(null)
  const [saving,   setSaving]   = useState(false)

  useEffect(() => { if (profile?.structure_id) load() }, [profile?.structure_id])

  async function load() {
    setLoading(true)
    const [{ data: compData }, { data: dojoData }] = await Promise.all([
      supabase.from('competences')
        .select('id, title, numero, bloc')
        .eq('structure_id', profile.structure_id)
        .order('numero'),
      supabase.from('dojos')
        .select('*')
        .eq('structure_id', profile.structure_id)
        .order('created_at', { ascending: true }),
    ])
    const raw = compData || []
    setAllComps(raw)
    const compMap = {}
    raw.forEach(c => { compMap[c.id] = { ...c, dojos: [] } })
    ;(dojoData || []).forEach(d => {
      if (d.competence_id && compMap[d.competence_id]) compMap[d.competence_id].dojos.push(d)
    })
    setComps(raw.map(c => compMap[c.id]))
    setLoading(false)
  }

  function openAdd(defaultCompId = '') {
    setForm({ titre: '', objectif: '', duree: '', competenceId: defaultCompId })
    setFile(null)
    setModal('add')
  }

  function openEdit(dojo) {
    setForm({ titre: dojo.titre, objectif: dojo.objectif || '', duree: dojo.duree || '', competenceId: dojo.competence_id || '' })
    setFile(null)
    setModal({ type: 'edit', dojo })
  }

  async function handleSave() {
    if (!form.titre.trim()) return
    setSaving(true)

    let fichier_url = modal?.dojo?.fichier_url || null

    if (file) {
      const ext = file.name.split('.').pop()
      const path = `${profile.structure_id}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('dojos-pptx')
        .upload(path, file, { upsert: true })
      if (uploadErr) {
        console.error('[Bibliothèque] upload error:', uploadErr)
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('dojos-pptx')
          .getPublicUrl(path)
        fichier_url = publicUrl
      }
    }

    const payload = {
      titre:         form.titre.trim(),
      structure_id:  profile.structure_id,
      objectif:      form.objectif.trim() || null,
      duree:         form.duree.trim() || null,
      competence_id: form.competenceId || null,
      fichier_url:   fichier_url || null,
    }

    let dbError
    if (modal?.type === 'edit') {
      const { error } = await supabase.from('dojos').update(payload).eq('id', modal.dojo.id)
      dbError = error
    } else {
      const { error } = await supabase.from('dojos').insert(payload)
      dbError = error
    }

    if (dbError) {
      console.error('[Bibliothèque] DB error:', dbError)
      alert(`Erreur Supabase : ${dbError.message}`)
      setSaving(false)
      return
    }

    await load()
    setModal(null)
    setSaving(false)
  }

  async function handleDelete(dojo) {
    if (!confirm(`Supprimer le dojo "${dojo.titre}" ?`)) return
    if (dojo.fichier_url) {
      const parts = dojo.fichier_url.split('/dojos-pptx/')
      if (parts.length === 2) {
        await supabase.storage.from('dojos-pptx').remove([parts[1]])
      }
    }
    await supabase.from('dojos').delete().eq('id', dojo.id)
    await load()
  }

  const totalDojos = comps.reduce((acc, c) => acc + (c?.dojos?.length || 0), 0)

  const blocs = [
    { key: 'tunnel_vente',  label: 'BLOC 1 — TUNNEL DE VENTE',            items: comps.filter(c => c.bloc === 'tunnel_vente') },
    { key: 'transversales', label: 'BLOC 2 — COMPÉTENCES TRANSVERSALES',  items: comps.filter(c => c.bloc === 'transversales') },
  ]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '18px 24px 14px', background: '#fff', borderBottom: '1px solid var(--ln)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, boxShadow: '0 1px 4px rgba(7,40,32,.04)' }}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 600, color: 'var(--fi)' }}>Bibliothèque Dojos</div>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 2 }}>
            {totalDojos} fiche{totalDojos !== 1 ? 's' : ''} de formation
            {isManager && totalDojos > 0 && ' · Téléchargement disponible'}
          </div>
        </div>
        {isAdmin && (
          <button onClick={() => openAdd()} style={btnPrimary}>
            <IconPlus size={15} /> Ajouter un dojo
          </button>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--mu)' }}>Chargement…</div>}

        {!loading && totalDojos === 0 && !isAdmin && (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <IconBook2 size={48} color="var(--mu)" style={{ marginBottom: 16 }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fi)', marginBottom: 8 }}>Bibliothèque vide</div>
            <div style={{ fontSize: 13, color: 'var(--mu)' }}>Les fiches de formation seront ajoutées prochainement.</div>
          </div>
        )}

        {!loading && blocs.map(({ key, label, items }) => (
          <div key={key} style={{ marginBottom: 36 }}>
            {/* Bloc separator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--forest)', letterSpacing: '1.2px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                {label}
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--forest)', opacity: .2 }} />
            </div>

            {items.map(comp => (
              <div key={comp.id} style={{ marginBottom: 24 }}>
                {/* Compétence header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--fluo)', flexShrink: 0 }}>
                    {String(comp.numero).padStart(2, '0')}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fi)', flex: 1 }}>{comp.title}</span>
                  <span style={{ fontSize: 11, color: 'var(--mu)', flexShrink: 0 }}>
                    {comp.dojos.length} dojo{comp.dojos.length !== 1 ? 's' : ''}
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => openAdd(comp.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--forest)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 6px', borderRadius: 6 }}
                    >
                      <IconPlus size={11} /> Ajouter
                    </button>
                  )}
                </div>

                {/* Cards */}
                {comp.dojos.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10, marginLeft: 36 }}>
                    {comp.dojos.map(dojo => (
                      <DojoCard
                        key={dojo.id}
                        dojo={dojo}
                        isAdmin={isAdmin}
                        isManager={isManager}
                        onEdit={() => openEdit(dojo)}
                        onDelete={() => handleDelete(dojo)}
                      />
                    ))}
                  </div>
                ) : (
                  <div style={{ marginLeft: 36, padding: '10px 14px', borderRadius: 9, background: 'var(--bg)', fontSize: 12, color: 'var(--mu)', fontStyle: 'italic' }}>
                    Aucune fiche pour cette compétence
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Modal */}
      {(modal === 'add' || modal?.type === 'edit') && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(7,40,32,.35)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}
          onClick={() => setModal(null)}
        >
          <div
            style={{ background: '#fff', borderRadius: 16, padding: 24, width: 480, boxShadow: '0 16px 48px rgba(7,40,32,.2)', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fi)' }}>
                {modal === 'add' ? 'Nouveau dojo' : 'Modifier le dojo'}
              </div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mu)', padding: 2 }}>
                <IconX size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Titre *">
                <input
                  value={form.titre}
                  onChange={e => setForm(p => ({ ...p, titre: e.target.value }))}
                  placeholder="Ex : Méthode CAB — argumentation produit"
                  style={inputStyle}
                  autoFocus
                />
              </Field>

              <Field label="Objectif">
                <textarea
                  value={form.objectif}
                  onChange={e => setForm(p => ({ ...p, objectif: e.target.value }))}
                  placeholder="Ce que le vendeur saura faire après ce dojo…"
                  style={{ ...inputStyle, resize: 'none', height: 72 }}
                />
              </Field>

              <Field label="Durée">
                <input
                  value={form.duree}
                  onChange={e => setForm(p => ({ ...p, duree: e.target.value }))}
                  placeholder="Ex : 30 min, 1h30"
                  style={inputStyle}
                />
              </Field>

              <Field label="Compétence associée *">
                <select
                  value={form.competenceId}
                  onChange={e => setForm(p => ({ ...p, competenceId: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="">Choisir une compétence…</option>
                  <option disabled>── Tunnel de vente ──</option>
                  {allComps.filter(c => c.bloc === 'tunnel_vente').map(c => (
                    <option key={c.id} value={c.id}>C{String(c.numero).padStart(2, '0')} — {c.title}</option>
                  ))}
                  <option disabled>── Compétences transversales ──</option>
                  {allComps.filter(c => c.bloc === 'transversales').map(c => (
                    <option key={c.id} value={c.id}>C{String(c.numero).padStart(2, '0')} — {c.title}</option>
                  ))}
                </select>
              </Field>

              <Field label="Fichier PPTX / PDF">
                <label style={{ ...inputStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: file ? 'var(--fi)' : 'var(--mu)' }}>
                  <IconBook2 size={15} color="var(--forest)" style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file ? file.name : modal?.dojo?.fichier_url ? '📎 Fichier existant — cliquer pour remplacer' : 'Choisir un fichier…'}
                  </span>
                  <input type="file" accept=".pptx,.ppt,.pdf" onChange={e => setFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                </label>
                {modal?.dojo?.fichier_url && !file && (
                  <a href={modal.dojo.fichier_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--forest)', marginTop: 4 }}>
                    Voir le fichier actuel ↗
                  </a>
                )}
              </Field>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                <button onClick={() => setModal(null)} style={btnGhost}>Annuler</button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.titre.trim() || !form.competenceId}
                  style={{ ...btnPrimary, opacity: (!form.titre.trim() || !form.competenceId) ? 0.5 : 1 }}
                >
                  {saving ? 'Enregistrement…' : modal === 'add' ? 'Créer le dojo' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DojoCard({ dojo, isAdmin, isManager, onEdit, onDelete }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, boxShadow: 'var(--sh)',
      padding: '14px 15px', display: 'flex', flexDirection: 'column', gap: 7,
      border: '1px solid var(--ln)',
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fi)', lineHeight: 1.35 }}>
        {dojo.titre}
      </div>

      {dojo.objectif && (
        <div style={{ fontSize: 11, color: 'var(--mu)', lineHeight: 1.5 }}>
          {dojo.objectif}
        </div>
      )}

      {dojo.duree && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--forest)', fontWeight: 600 }}>
          <IconClock size={11} /> {dojo.duree}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
        {isManager && dojo.fichier_url ? (
          <a
            href={dojo.fichier_url}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, flex: 1, justifyContent: 'center',
              padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
              background: 'var(--forest)', color: 'var(--fluo)', textDecoration: 'none',
            }}
          >
            <IconDownload size={12} /> Télécharger
          </a>
        ) : !isManager && dojo.fichier_url ? (
          <span style={{ fontSize: 11, color: 'var(--mu)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <IconBook2 size={11} /> Fiche disponible
          </span>
        ) : null}

        {isAdmin && (
          <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
            <button
              onClick={onEdit}
              style={{ background: 'var(--bg)', border: 'none', cursor: 'pointer', borderRadius: 7, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fi)' }}
            >
              <IconPencil size={13} />
            </button>
            <button
              onClick={onDelete}
              style={{ background: '#FEF2F2', border: 'none', cursor: 'pointer', borderRadius: 7, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626' }}
            >
              <IconTrash size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fi)' }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = {
  padding: '9px 12px', borderRadius: 9, border: '1px solid var(--ln)',
  fontSize: 13, background: 'var(--bg)', fontFamily: 'inherit', width: '100%',
  boxSizing: 'border-box',
}

const btnPrimary = {
  background: 'var(--forest)', color: 'var(--fluo)', border: 'none',
  padding: '9px 17px', borderRadius: 9, fontSize: 13, fontWeight: 600,
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
  boxShadow: '0 2px 8px rgba(11,61,46,.2)',
}

const btnGhost = {
  background: '#fff', color: 'var(--fi)', border: '1px solid var(--ln)',
  padding: '9px 14px', borderRadius: 9, fontSize: 13, cursor: 'pointer',
}
