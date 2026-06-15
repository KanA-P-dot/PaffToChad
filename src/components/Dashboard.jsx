import { useCallback, useEffect, useState } from 'react'
import { format, subDays, addDays, isToday } from 'date-fns'
import { fr } from 'date-fns/locale'
import { supabase } from '../lib/supabase'
import { fetchStreak } from '../lib/streak'
import StatsModule from './StatsModule'
import ObjectifsEditor from './ObjectifsEditor'

// ─── Utilitaire : formater une Date en YYYY-MM-DD ─────────────────────────────
const toISO = (d) => format(d, 'yyyy-MM-dd')

export default function Dashboard({ user, onLogout }) {
  const [view, setView]           = useState('dashboard') // 'dashboard' | 'stats' | 'objectifs'
  const [currentDate, setCurrent] = useState(new Date())
  const [objectifs, setObjectifs] = useState([])
  const [logs, setLogs]           = useState({})        // { objectif_id: boolean }
  const [saving, setSaving]       = useState({})        // { objectif_id: true } en cours de save
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [streak, setStreak]       = useState(null)

  // Charge les objectifs (rappelable après édition)
  const loadObjectifs = useCallback(async () => {
    const { data } = await supabase
      .from('objectifs')
      .select('*')
      .eq('user_id', user.id)
      .order('order_index')
    if (data) setObjectifs(data)
  }, [user.id])

  useEffect(() => { loadObjectifs() }, [loadObjectifs])

  // Charge les logs dès que la date ou l'user change
  const loadLogs = useCallback(async () => {
    setLoadingLogs(true)
    const { data } = await supabase
      .from('logs')
      .select('objectif_id, completed')
      .eq('user_id', user.id)
      .eq('date', toISO(currentDate))

    const map = {}
    if (data) data.forEach(l => { map[l.objectif_id] = l.completed })
    setLogs(map)
    setLoadingLogs(false)
  }, [user.id, currentDate])

  useEffect(() => { loadLogs() }, [loadLogs])

  // Charge / rafraîchit le streak (recalcul si les logs d'aujourd'hui changent)
  const completedCount = objectifs.filter(o => logs[o.id]).length
  const totalCount     = objectifs.length
  useEffect(() => {
    fetchStreak(user.id).then(setStreak)
  }, [user.id, isToday(currentDate) ? completedCount : null])  // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle un objectif (upsert Supabase)
  const toggle = async (objectif_id) => {
    const newVal = !logs[objectif_id]
    // Optimistic UI
    setLogs(prev => ({ ...prev, [objectif_id]: newVal }))
    setSaving(prev => ({ ...prev, [objectif_id]: true }))

    const { error } = await supabase
      .from('logs')
      .upsert(
        { user_id: user.id, objectif_id, date: toISO(currentDate), completed: newVal },
        { onConflict: 'user_id,objectif_id,date' }
      )

    if (error) {
      // rollback si erreur
      setLogs(prev => ({ ...prev, [objectif_id]: !newVal }))
      console.error('Supabase upsert error:', error.message)
    }
    setSaving(prev => ({ ...prev, [objectif_id]: false }))
  }

  const goBack    = () => setCurrent(d => subDays(d, 1))
  const goForward = () => { if (!isToday(currentDate)) setCurrent(d => addDays(d, 1)) }
  const goToday   = () => setCurrent(new Date())

  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  if (view === 'stats') {
    return <StatsModule user={user} onBack={() => setView('dashboard')} />
  }

  if (view === 'objectifs') {
    return (
      <ObjectifsEditor
        user={user}
        onBack={() => { setView('dashboard'); loadObjectifs() }}
        onObjectifsChange={loadObjectifs}
      />
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/60 px-5 pb-4 pt-safe">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {/* Logo */}
          <button
            onClick={onLogout}
            className="text-xl font-black text-white tracking-tight hover:opacity-70 transition-opacity"
          >
            Paff<span className="text-chad-500">To</span>Chad
          </button>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('stats')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Stats
            </button>
            <button
              onClick={() => setView('objectifs')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Objectifs
            </button>
            <button
              onClick={onLogout}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
              title="Se déconnecter"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── CORPS ──────────────────────────────────────────────────── */}
      <main className="flex-1 px-5 py-6 max-w-md mx-auto w-full">

        {/* Profil utilisateur */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-chad-500 ring-offset-2 ring-offset-slate-950 flex-shrink-0">
            {user.avatar_url
              ? <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              : <span className="w-full h-full flex items-center justify-center bg-chad-500/20 text-chad-300 font-bold">{user.name[0]}</span>
            }
          </div>
          <div>
            <p className="text-white font-semibold leading-tight">
              Salut, {user.name} 👊
              {streak > 0 && (
                <span className="ml-2 text-orange-400 font-bold text-sm">🔥 {streak} jour{streak > 1 ? 's' : ''}</span>
              )}
            </p>
            <p className="text-slate-400 text-xs">
              {isToday(currentDate) ? "C'est l'heure de dominer aujourd'hui" : 'Rattrapage en cours…'}
            </p>
          </div>
        </div>

        {/* Sélecteur de date */}
        <div className="flex items-center justify-between mb-3 bg-slate-900 rounded-2xl px-4 py-3 border border-slate-800">
          <button
            onClick={goBack}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button onClick={goToday} className="text-center group">
            <p className="text-white font-bold text-lg leading-tight capitalize group-hover:text-chad-400 transition-colors">
              {format(currentDate, 'EEEE d MMMM', { locale: fr })}
            </p>
            {!isToday(currentDate) && (
              <span className="text-xs text-amber-400 font-medium">← Revenir à aujourd'hui</span>
            )}
          </button>

          <button
            onClick={goForward}
            disabled={isToday(currentDate)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Barre de progression globale */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-slate-400 text-xs font-medium">Progression du jour</span>
            <span className={`text-xs font-bold ${progress === 100 ? 'text-green-400' : 'text-white'}`}>
              {completedCount}/{totalCount} — {progress}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progress === 100
                  ? 'bg-green-500'
                  : progress >= 50
                  ? 'bg-chad-500'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Message de félicitations */}
        {progress === 100 && (
          <div className="mb-4 p-4 rounded-2xl bg-green-950/50 border border-green-800/50 text-center">
            <p className="text-green-400 font-bold text-lg">🏆 JOURNÉE PARFAITE !</p>
            <p className="text-green-600 text-sm mt-1">Tous les objectifs accomplis. Chad mode activé.</p>
          </div>
        )}

        {/* Liste des objectifs */}
        <div className="flex flex-col gap-3">
          {loadingLogs
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 rounded-2xl bg-slate-900 animate-pulse border border-slate-800" />
              ))
            : objectifs.map((obj, i) => (
                <ObjectifCard
                  key={obj.id}
                  objectif={obj}
                  completed={!!logs[obj.id]}
                  isSaving={!!saving[obj.id]}
                  isFirst={i === 0}
                  onToggle={() => toggle(obj.id)}
                />
              ))
          }
        </div>
      </main>
    </div>
  )
}

// ─── Carte d'un objectif ──────────────────────────────────────────────────────
function ObjectifCard({ objectif, completed, isSaving, isFirst, onToggle }) {
  return (
    <button
      onClick={onToggle}
      disabled={isSaving}
      className={`
        relative w-full text-left flex items-center gap-4 p-4
        rounded-2xl border transition-all duration-200 active:scale-[0.98]
        focus:outline-none
        ${completed
          ? 'bg-green-950/40 border-green-700/60 shadow-lg shadow-green-950/30'
          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
        }
        ${isSaving ? 'opacity-70 cursor-wait' : ''}
      `}
    >
      {/* Indicateur obligatoire */}
      {isFirst && (
        <span className="absolute top-2 right-3 text-[10px] font-bold text-chad-500 uppercase tracking-wider">
          Obligatoire
        </span>
      )}

      {/* Toggle visuel (grand bouton rond) */}
      <div className={`
        relative flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center
        transition-all duration-300
        ${completed
          ? 'bg-green-500 shadow-lg shadow-green-500/30'
          : 'bg-slate-800 border-2 border-slate-700'
        }
      `}>
        {isSaving ? (
          <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
        ) : completed ? (
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-7 h-7 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </div>

      {/* Texte */}
      <div className="flex-1 min-w-0 pr-6">
        <p className={`font-semibold text-base leading-snug ${completed ? 'text-green-300' : 'text-white'}`}>
          {objectif.title}
        </p>
        {objectif.description && (
          <p className={`text-xs mt-0.5 ${completed ? 'text-green-600' : 'text-slate-500'}`}>
            {objectif.description}
          </p>
        )}
      </div>

      {/* Badge statut */}
      <span className={`
        flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-lg
        ${completed ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-500'}
      `}>
        {completed ? 'Fait' : 'À faire'}
      </span>
    </button>
  )
}
