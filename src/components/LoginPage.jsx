import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fetchStreak } from '../lib/streak'
import { fetchWeeklyScores } from '../lib/weeklyScore'
import WeeklyScoreWidget from './WeeklyScoreWidget'
import AccountEditor from './AccountEditor'

export default function LoginPage({ onLogin }) {
  const [users, setUsers]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [streaks, setStreaks]        = useState({})
  const [weeklyScores, setWeeklyScores] = useState({})
  const [editing, setEditing]       = useState(null) // null | 'new' | userObject

  function loadUsers() {
    setLoading(true)
    supabase
      .from('users')
      .select('*')
      .order('name')
      .then(({ data, error }) => {
        if (error) setError(error.message || JSON.stringify(error))
        else {
          setUsers(data ?? [])
          data?.forEach(u => {
            fetchStreak(u.id).then(s => setStreaks(prev => ({ ...prev, [u.id]: s })))
          })
          fetchWeeklyScores().then(result => {
            if (result) setWeeklyScores(result.scores)
          })
        }
        setLoading(false)
      })
      .catch(err => {
        setError('Crash: ' + err.message)
        setLoading(false)
      })
  }

  useEffect(() => { loadUsers() }, [])

  async function deleteUser(user) {
    if (!confirm(`Supprimer le compte "${user.name}" ?\nCette action est irréversible (objectifs et historique supprimés).`)) return
    const { error } = await supabase.from('users').delete().eq('id', user.id)
    if (error) { alert('Erreur : ' + error.message); return }
    setUsers(prev => prev.filter(u => u.id !== user.id))
  }

  // Vue AccountEditor (création ou édition)
  if (editing !== null) {
    return (
      <AccountEditor
        user={editing === 'new' ? null : editing}
        onBack={() => setEditing(null)}
        onSaved={() => { setEditing(null); loadUsers() }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6 py-12">

      {/* Logo / Titre */}
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-black tracking-tight text-white">
          Paff<span className="text-chad-500">To</span>Chad
        </h1>
        <p className="mt-2 text-slate-400 text-sm tracking-widest uppercase">
          Qui êtes-vous aujourd'hui ?
        </p>
      </div>

      {/* État de chargement */}
      {loading && (
        <div className="flex gap-2 items-center text-slate-400">
          <span className="w-4 h-4 rounded-full border-2 border-chad-500 border-t-transparent animate-spin" />
          <span>Chargement…</span>
        </div>
      )}

      {/* Erreur */}
      {error !== null && (
        <p className="text-red-400 bg-red-950/50 border border-red-800 rounded-xl px-4 py-3 text-sm break-all">
          Erreur : {error || '(vide)'}
        </p>
      )}

      {/* Aucun utilisateur trouvé */}
      {!loading && error === null && users.length === 0 && (
        <p className="text-yellow-400 bg-yellow-950/50 border border-yellow-800 rounded-xl px-4 py-3 text-sm">
          Aucun utilisateur trouvé en base de données.
        </p>
      )}

      {/* Cartes profils */}
      {!loading && !error && (
        <div className="w-full max-w-sm flex flex-col gap-4">
          {users.map((user, i) => (
            <ProfileCard
              key={user.id}
              user={user}
              accent={i === 0 ? 'chad' : 'indigo'}
              streak={streaks[user.id] ?? null}
              weeklyScore={weeklyScores[user.id] ?? null}
              onLogin={onLogin}
              onEdit={() => setEditing(user)}
              onDelete={() => deleteUser(user)}
            />
          ))}

          {/* Bouton nouveau compte */}
          <button
            onClick={() => setEditing('new')}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouveau compte
          </button>
        </div>
      )}

      {/* Score de la semaine */}
      {!loading && !error && (
        <div className="w-full max-w-sm mt-6">
          <WeeklyScoreWidget />
        </div>
      )}

      <p className="mt-4 text-slate-600 text-xs">v1.0 · Session locale</p>
    </div>
  )
}

function ProfileCard({ user, accent, streak, weeklyScore, onLogin, onEdit, onDelete }) {
  const [pressing, setPressing] = useState(false)
  const [imgError, setImgError] = useState(false)

  const border  = accent === 'chad'   ? 'border-chad-500/30 hover:border-chad-500'   : 'border-indigo-500/30 hover:border-indigo-500'
  const glow    = accent === 'chad'   ? 'hover:shadow-chad-500/20'                   : 'hover:shadow-indigo-500/20'
  const ring    = accent === 'chad'   ? 'ring-chad-500'                              : 'ring-indigo-500'
  const badge   = accent === 'chad'   ? 'bg-chad-500/20 text-chad-300'              : 'bg-indigo-500/20 text-indigo-300'

  return (
    <button
      onMouseDown={() => setPressing(true)}
      onMouseUp={() => setPressing(false)}
      onTouchStart={() => setPressing(true)}
      onTouchEnd={() => setPressing(false)}
      onClick={() => onLogin(user)}
      className={`
        relative w-full flex items-center gap-5 p-5
        bg-slate-900 border ${border}
        rounded-2xl transition-all duration-200
        shadow-lg ${glow} hover:shadow-2xl
        ${pressing ? 'scale-95 opacity-80' : 'scale-100'}
        focus:outline-none focus:ring-2 ${ring} focus:ring-offset-2 focus:ring-offset-slate-950
      `}
    >
      {/* Boutons edit / delete */}
      <div className="absolute top-2 right-2 flex gap-1" onClick={e => e.stopPropagation()}>
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-colors"
          aria-label="Modifier"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a4 4 0 01-2.828 1.172H7v-2a4 4 0 011.172-2.828z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-700 transition-colors"
          aria-label="Supprimer"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 011-1h4a1 1 0 011 1m-7 0h8" />
          </svg>
        </button>
      </div>

      {/* Avatar */}
      <div className={`relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden ring-2 ${ring} ring-offset-2 ring-offset-slate-900`}>
        {imgError ? (
          <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white font-bold text-2xl">
            {user.name[0].toUpperCase()}
          </div>
        ) : (
          <img
            src={user.avatar_url || `/avatars/${user.name.toLowerCase()}.png`}
            alt={user.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        )}
      </div>

      {/* Infos */}
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <p className="text-white font-bold text-xl leading-tight">{user.name}</p>
          {streak > 0 && (
            <span className="text-orange-400 font-bold text-sm">🔥 {streak}</span>
          )}
        </div>
        <p className="text-slate-400 text-sm mt-0.5">{user.email}</p>
        {weeklyScore && weeklyScore.chad > weeklyScore.paff && (
          <p className="text-amber-400 text-xs font-semibold mt-1">🗿 chad de la semaine</p>
        )}
        {weeklyScore && weeklyScore.paff > weeklyScore.chad && (
          <p className="text-red-400 text-xs font-semibold mt-1">🤡 paff de la semaine</p>
        )}
      </div>

      {/* Flèche */}
      <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}
