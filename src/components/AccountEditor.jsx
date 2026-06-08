import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AccountEditor({ user, onBack, onSaved }) {
  const isNew = !user

  const [name,          setName]          = useState(user?.name          ?? '')
  const [email,         setEmail]         = useState(user?.email         ?? '')
  const [avatarFile,    setAvatarFile]    = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState(null)

  const fileInputRef = useRef(null)

  // Avatar à afficher : preview locale > avatar_url existant > initiales
  const displayAvatar = avatarPreview ?? user?.avatar_url ?? null
  const initial       = (name || user?.name || '?')[0].toUpperCase()

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    setError(null)

    if (!name.trim())  return setError('Le nom est requis.')
    if (!email.trim()) return setError('L\'email est requis.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Email invalide.')

    setSaving(true)
    try {
      // 1. Upload l'avatar si un fichier a été sélectionné
      let avatarUrl = user?.avatar_url ?? null
      if (avatarFile) {
        const ext  = avatarFile.name.split('.').pop()
        const path = `${crypto.randomUUID()}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true })
        if (uploadErr) throw uploadErr
        avatarUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
      }

      // 2. Insert ou Update
      let savedUser
      if (isNew) {
        const { data, error: insertErr } = await supabase
          .from('users')
          .insert({ name: name.trim(), email: email.trim(), avatar_url: avatarUrl })
          .select()
          .single()
        if (insertErr) throw insertErr
        savedUser = data
      } else {
        const { data, error: updateErr } = await supabase
          .from('users')
          .update({ name: name.trim(), email: email.trim(), avatar_url: avatarUrl })
          .eq('id', user.id)
          .select()
          .single()
        if (updateErr) throw updateErr
        savedUser = data
      }

      onSaved(savedUser)
    } catch (err) {
      setError(err.message ?? 'Une erreur est survenue.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">

      {/* Header */}
      <header className="flex items-center gap-3 px-5 py-4 border-b border-slate-800">
        <button
          onClick={onBack}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Retour"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-white font-bold text-lg">
          {isNew ? 'Nouveau compte' : 'Modifier le compte'}
        </h1>
      </header>

      {/* Contenu */}
      <div className="flex-1 flex flex-col items-center px-6 py-8 gap-6 max-w-sm mx-auto w-full">

        {/* Avatar cliquable */}
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative w-24 h-24 rounded-full overflow-hidden ring-2 ring-chad-500 ring-offset-2 ring-offset-slate-950 group"
          >
            {displayAvatar ? (
              <img src={displayAvatar} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white font-bold text-3xl">
                {initial}
              </div>
            )}
            {/* Overlay crayon */}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a4 4 0 01-2.828 1.172H7v-2a4 4 0 011.172-2.828z" />
              </svg>
            </div>
          </button>
          <span className="text-slate-500 text-xs">Appuie pour choisir une photo</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Champs */}
        <div className="w-full flex flex-col gap-3">
          <div>
            <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5 block">
              Nom
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ton prénom ou pseudo"
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 text-sm border border-slate-700 focus:outline-none focus:border-chad-500 placeholder-slate-500"
            />
          </div>

          <div>
            <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5 block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ton@email.com"
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 text-sm border border-slate-700 focus:outline-none focus:border-chad-500 placeholder-slate-500"
            />
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <p className="w-full text-red-400 bg-red-950/50 border border-red-800 rounded-xl px-4 py-3 text-sm">
            {error}
          </p>
        )}

        {/* Bouton sauvegarder */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-chad-500 hover:bg-chad-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {saving && (
            <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          )}
          {saving ? 'Enregistrement…' : (isNew ? 'Créer le compte' : 'Sauvegarder')}
        </button>
      </div>
    </div>
  )
}
