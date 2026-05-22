import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPage({ onLogin }) {
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    supabase
      .from('users')
      .select('*')
      .order('name')
      .then(({ data, error }) => {
        console.log('[PTC] data:', data, 'error:', error)
        if (error) setError(error.message || JSON.stringify(error))
        else setUsers(data ?? [])
        setLoading(false)
      })
      .catch(err => {
        console.error('[PTC] fetch crash:', err)
        setError('Crash: ' + err.message)
        setLoading(false)
      })
  }, [])

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
              onLogin={onLogin}
            />
          ))}
        </div>
      )}

      <p className="mt-10 text-slate-600 text-xs">v1.0 · Session locale</p>
    </div>
  )
}

function ProfileCard({ user, accent, onLogin }) {
  const [pressing, setPressing] = useState(false)

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
      {/* Avatar */}
      <div className={`relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden ring-2 ${ring} ring-offset-2 ring-offset-slate-900`}>
        <img
          src={user.name === 'Alex' ? '/avatars/alex.png' : '/avatars/aurel.png'}
          alt={user.name}
          className="w-full h-full object-cover"
        />
        </div>

      {/* Infos */}
      <div className="flex-1 text-left">
        <p className="text-white font-bold text-xl leading-tight">{user.name}</p>
        <p className="text-slate-400 text-sm mt-0.5">{user.email}</p>
      </div>

      {/* Flèche */}
      <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}
