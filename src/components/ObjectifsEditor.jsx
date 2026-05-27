import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ObjectifsEditor({ user, onBack, onObjectifsChange }) {
  const [mine, setMine]                         = useState([])
  const [collegueObjectifs, setCollegueObjectifs] = useState([])
  const [collegue, setCollegue]                 = useState(null)
  const [loading, setLoading]                   = useState(true)
  const [saving, setSaving]                     = useState(false)
  const [showAddForm, setShowAddForm]            = useState(false)
  const [newTitle, setNewTitle]                 = useState('')
  const [newDesc, setNewDesc]                   = useState('')
  const [editingId, setEditingId]               = useState(null)
  const [editTitle, setEditTitle]               = useState('')
  const [editDesc, setEditDesc]                 = useState('')
  const [dropActive, setDropActive]             = useState(false)
  const [draggingObj, setDraggingObj]           = useState(null)

  useEffect(() => { loadData() }, [user.id])

  const loadData = async () => {
    setLoading(true)
    const [{ data: users }, { data: myData }] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('objectifs').select('*').eq('user_id', user.id).order('order_index'),
    ])
    const other = users?.find(u => u.id !== user.id) ?? null
    setCollegue(other)
    setMine(myData ?? [])
    if (other) {
      const { data: otherData } = await supabase
        .from('objectifs').select('*').eq('user_id', other.id).order('order_index')
      setCollegueObjectifs(otherData ?? [])
    }
    setLoading(false)
  }

  const nextIndex = () => mine.length ? Math.max(...mine.map(o => o.order_index)) + 1 : 0

  const reindex = (list) =>
    Promise.all(list.map((o, i) => supabase.from('objectifs').update({ order_index: i }).eq('id', o.id)))

  const addObjectif = async () => {
    if (!newTitle.trim()) return
    setSaving(true)
    const { data, error } = await supabase
      .from('objectifs')
      .insert({ title: newTitle.trim(), description: newDesc.trim() || null, order_index: nextIndex(), user_id: user.id })
      .select().single()
    if (!error && data) {
      setMine(p => [...p, data])
      setNewTitle('')
      setNewDesc('')
      setShowAddForm(false)
      onObjectifsChange?.()
    }
    setSaving(false)
  }

  const saveEdit = async () => {
    if (!editTitle.trim() || !editingId) return
    setSaving(true)
    const { error } = await supabase.from('objectifs')
      .update({ title: editTitle.trim(), description: editDesc.trim() || null })
      .eq('id', editingId)
    if (!error) {
      setMine(p => p.map(o => o.id === editingId
        ? { ...o, title: editTitle.trim(), description: editDesc.trim() || null }
        : o
      ))
      setEditingId(null)
      onObjectifsChange?.()
    }
    setSaving(false)
  }

  const deleteObjectif = async (id) => {
    if (!confirm('Supprimer cet objectif ? Les logs associés seront aussi supprimés.')) return
    await supabase.from('objectifs').delete().eq('id', id)
    const updated = mine.filter(o => o.id !== id)
    setMine(updated)
    reindex(updated)
    onObjectifsChange?.()
  }

  const move = async (i, dir) => {
    const j = i + dir
    if (j < 0 || j >= mine.length) return
    const updated = [...mine]
    ;[updated[i], updated[j]] = [updated[j], updated[i]]
    setMine(updated)
    await reindex(updated)
    onObjectifsChange?.()
  }

  const copyFromCollegue = async (obj) => {
    const { data, error } = await supabase
      .from('objectifs')
      .insert({ title: obj.title, description: obj.description, order_index: nextIndex(), user_id: user.id })
      .select().single()
    if (!error && data) {
      setMine(p => [...p, data])
      onObjectifsChange?.()
    }
  }

  const startEdit = (obj) => {
    setEditingId(obj.id)
    setEditTitle(obj.title)
    setEditDesc(obj.description ?? '')
    setShowAddForm(false)
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">

      {/* ── HEADER ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/60 px-5 py-4">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <button
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-white font-bold text-lg">Mes objectifs</h2>
        </div>
      </header>

      {/* ── CORPS ───────────────────────────────────────────────── */}
      <main className="flex-1 px-5 py-6 max-w-md mx-auto w-full">

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 rounded-2xl bg-slate-900 animate-pulse border border-slate-800" />
            ))}
          </div>
        ) : (
          <>
            {/* ── MES OBJECTIFS ── */}
            <section
              className={`mb-8 p-1 rounded-2xl transition-colors ${
                dropActive ? 'ring-2 ring-chad-500/60 bg-chad-950/10' : ''
              }`}
              onDragOver={e => { e.preventDefault(); setDropActive(true) }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDropActive(false) }}
              onDrop={async e => {
                e.preventDefault()
                setDropActive(false)
                if (draggingObj) { await copyFromCollegue(draggingObj); setDraggingObj(null) }
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">
                  Mes objectifs{' '}
                  <span className="text-slate-500 font-normal text-sm">({mine.length})</span>
                </h3>
                <button
                  onClick={() => { setShowAddForm(v => !v); setEditingId(null) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-chad-500 hover:bg-chad-400 text-white text-sm font-semibold transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Ajouter
                </button>
              </div>

              {dropActive && (
                <div className="mb-3 py-3 rounded-xl border-2 border-dashed border-chad-500/60 text-center text-chad-400 text-sm font-medium">
                  Déposer pour copier l'objectif ici
                </div>
              )}

              {/* Formulaire d'ajout */}
              {showAddForm && (
                <div className="mb-3 p-4 rounded-2xl bg-slate-900 border border-slate-700">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Titre de l'objectif *"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addObjectif()}
                    className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm border border-slate-700 focus:outline-none focus:border-chad-500 mb-2 placeholder-slate-500"
                  />
                  <input
                    type="text"
                    placeholder="Description (optionnel)"
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addObjectif()}
                    className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm border border-slate-700 focus:outline-none focus:border-chad-500 mb-3 placeholder-slate-500"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => { setShowAddForm(false); setNewTitle(''); setNewDesc('') }}
                      className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={addObjectif}
                      disabled={saving || !newTitle.trim()}
                      className="px-4 py-1.5 rounded-lg bg-chad-500 hover:bg-chad-400 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
                    >
                      {saving ? 'Ajout…' : 'Ajouter'}
                    </button>
                  </div>
                </div>
              )}

              {mine.length === 0 && !showAddForm && (
                <div className="py-10 text-center text-slate-500 text-sm">
                  Aucun objectif pour l'instant.<br />
                  Ajoute-en un ou copie ceux du collègue ci-dessous ↓
                </div>
              )}

              <div className="flex flex-col gap-2">
                {mine.map((obj, i) => (
                  <div key={obj.id} className="rounded-2xl bg-slate-900 border border-slate-800">
                    {editingId === obj.id ? (
                      /* ── Formulaire d'édition inline ── */
                      <div className="p-4">
                        <input
                          autoFocus
                          type="text"
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm border border-slate-700 focus:outline-none focus:border-chad-500 mb-2"
                        />
                        <input
                          type="text"
                          value={editDesc}
                          onChange={e => setEditDesc(e.target.value)}
                          placeholder="Description (optionnel)"
                          className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm border border-slate-700 focus:outline-none focus:border-chad-500 mb-3 placeholder-slate-500"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white transition-colors"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={saveEdit}
                            disabled={saving || !editTitle.trim()}
                            className="px-4 py-1.5 rounded-lg bg-chad-500 hover:bg-chad-400 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
                          >
                            {saving ? 'Sauvegarde…' : 'Enregistrer'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── Ligne objectif ── */
                      <div className="flex items-center gap-2 px-3 py-3">
                        {/* Boutons de réordonnancement */}
                        <div className="flex flex-col gap-0.5 flex-shrink-0">
                          <button
                            onClick={() => move(i, -1)}
                            disabled={i === 0}
                            className="w-6 h-5 flex items-center justify-center rounded text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => move(i, 1)}
                            disabled={i === mine.length - 1}
                            className="w-6 h-5 flex items-center justify-center rounded text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>

                        {/* Contenu */}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold truncate">{obj.title}</p>
                          {obj.description && (
                            <p className="text-slate-500 text-xs truncate">{obj.description}</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => startEdit(obj)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                            title="Modifier"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteObjectif(obj.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                            title="Supprimer"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* ── OBJECTIFS DU COLLÈGUE ── */}
            {collegue && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs text-indigo-400 font-bold">{collegue.name[0]}</span>
                  </div>
                  <h3 className="text-white font-semibold">Objectifs de {collegue.name}</h3>
                  <span className="text-slate-600 text-xs">— glisse ou copie</span>
                </div>

                <div className="flex flex-col gap-2">
                  {collegueObjectifs.length === 0 && (
                    <p className="text-slate-500 text-sm py-4 text-center">
                      {collegue.name} n'a pas encore d'objectifs.
                    </p>
                  )}
                  {collegueObjectifs.map(obj => {
                    const alreadyMine = mine.some(o => o.title === obj.title)
                    return (
                      <div
                        key={obj.id}
                        draggable={!alreadyMine}
                        onDragStart={e => {
                          setDraggingObj(obj)
                          e.dataTransfer.effectAllowed = 'copy'
                        }}
                        onDragEnd={() => setDraggingObj(null)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all select-none ${
                          alreadyMine
                            ? 'bg-slate-900/30 border-slate-800/40 opacity-50 cursor-default'
                            : 'bg-slate-900 border-slate-800 hover:border-indigo-700/50 cursor-grab active:cursor-grabbing'
                        }`}
                      >
                        {/* Handle drag */}
                        <svg className="w-4 h-4 text-slate-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                        </svg>

                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold truncate">{obj.title}</p>
                          {obj.description && (
                            <p className="text-slate-500 text-xs truncate">{obj.description}</p>
                          )}
                        </div>

                        <button
                          onClick={() => !alreadyMine && copyFromCollegue(obj)}
                          disabled={alreadyMine}
                          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors flex-shrink-0 ${
                            alreadyMine
                              ? 'text-green-600 cursor-default'
                              : 'text-slate-500 hover:text-chad-400 hover:bg-slate-800'
                          }`}
                          title={alreadyMine ? 'Déjà dans ta liste' : 'Copier dans mes objectifs'}
                        >
                          {alreadyMine ? (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
