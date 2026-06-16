import { useCallback, useEffect, useState } from 'react'
import { format, subDays, addDays, isToday } from 'date-fns'
import { fr } from 'date-fns/locale'
import { supabase } from '../lib/supabase'
import { fetchStreak } from '../lib/streak'
import { fetchObjectifStreaks } from '../lib/objectifStreak'
import StatsModule from './StatsModule'
import ObjectifsEditor from './ObjectifsEditor'
import Confetti from './Confetti'
import PatchNoteModal, { PATCH_NOTE_KEY } from './PatchNoteModal'

const toISO = (d) => format(d, 'yyyy-MM-dd')

export default function Dashboard({ user, onLogout }) {
  const [view, setView]           = useState('dashboard')
  const [currentDate, setCurrent] = useState(new Date())
  const [objectifs, setObjectifs] = useState([])
  const [logs, setLogs]           = useState({})
  const [saving, setSaving]       = useState({})
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [streak, setStreak]       = useState(null)
  const [objectifStreaks, setObjectifStreaks] = useState({})
  const [rival, setRival]         = useState(null)
  const [confettiKey, setConfettiKey] = useState(0)
  const [showPatchNote, setShowPatchNote] = useState(
    () => !localStorage.getItem(PATCH_NOTE_KEY)
  )

  const closePatchNote = () => {
    localStorage.setItem(PATCH_NOTE_KEY, '1')
    setShowPatchNote(false)
  }

  const loadObjectifs = useCallback(async () => {
    const { data } = await supabase
      .from('objectifs')
      .select('*')
      .eq('user_id', user.id)
      .order('order_index')
    if (data) setObjectifs(data)
  }, [user.id])

  useEffect(() => { loadObjectifs() }, [loadObjectifs])

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

  const completedCount = objectifs.filter(o => logs[o.id]).length
  const totalCount     = objectifs.length

  // Streak global
  useEffect(() => {
    fetchStreak(user.id).then(setStreak)
  }, [user.id, isToday(currentDate) ? completedCount : null])  // eslint-disable-line react-hooks/exhaustive-deps

  // Streaks par objectif individuel
  const loadObjectifStreaks = useCallback(() => {
    fetchObjectifStreaks(user.id).then(setObjectifStreaks)
  }, [user.id])

  useEffect(() => { loadObjectifStreaks() }, [loadObjectifStreaks])

  // Progression de l'adversaire (live, seulement aujourd'hui)
  const loadRivalProgress = useCallback(async () => {
    if (!isToday(currentDate)) { setRival(null); return }

    const { data: users } = await supabase
      .from('users')
      .select('id, name, avatar_url')
    if (!users) return

    const rivalUser = users.find(u => u.id !== user.id)
    if (!rivalUser) return

    const [{ data: rivalObjs }, { data: rivalLogs }] = await Promise.all([
      supabase.from('objectifs').select('id').eq('user_id', rivalUser.id),
      supabase.from('logs').select('objectif_id, completed')
        .eq('user_id', rivalUser.id)
        .eq('date', toISO(currentDate)),
    ])

    const total     = rivalObjs?.length ?? 0
    const completed = rivalLogs?.filter(l => l.completed).length ?? 0
    setRival({ user: rivalUser, completed, total })
  }, [user.id, currentDate])

  useEffect(() => { loadRivalProgress() }, [loadRivalProgress])

  // Rafraîchissement automatique du rival toutes les 30s quand on est sur aujourd'hui
  useEffect(() => {
    if (!isToday(currentDate)) return
    const id = setInterval(loadRivalProgress, 30_000)
    return () => clearInterval(id)
  }, [currentDate, loadRivalProgress])

  // Toggle un objectif (upsert Supabase)
  const toggle = async (objectif_id) => {
    const newVal  = !logs[objectif_id]
    const newLogs = { ...logs, [objectif_id]: newVal }

    // Optimistic UI
    setLogs(newLogs)
    setSaving(prev => ({ ...prev, [objectif_id]: true }))

    // Déclenche les confettis si le dernier objectif vient d'être coché
    if (newVal && isToday(currentDate)) {
      const newCompleted = objectifs.filter(o => newLogs[o.id]).length
      if (newCompleted === objectifs.length && objectifs.length > 0) {
        setConfettiKey(k => k + 1)
      }
    }

    const { error } = await supabase
      .from('logs')
      .upsert(
        { user_id: user.id, objectif_id, date: toISO(currentDate), completed: newVal },
        { onConflict: 'user_id,objectif_id,date' }
      )

    if (error) {
      setLogs(prev => ({ ...prev, [objectif_id]: !newVal }))
      console.error('Supabase upsert error:', error.message)
    } else if (isToday(currentDate)) {
      loadObjectifStreaks()
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
      <Confetti trigger={confettiKey} />
      {showPatchNote && <PatchNoteModal onClose={closePatchNote} />}

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/60 px-5 pb-4 pt-safe">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <button
            onClick={onLogout}
            className="text-xl font-black text-white tracking-tight hover:opacity-70 transition-opacity"
          >
            Paff<span className="text-chad-500">To</span>Chad
          </button>

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
        <div className="mb-5">
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

        {/* Widget adversaire en live */}
        {rival && isToday(currentDate) && (
          <RivalWidget rival={rival} myProgress={progress} />
        )}

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
                  streak={objectifStreaks[obj.id] || 0}
                  onToggle={() => toggle(obj.id)}
                />
              ))
          }
        </div>
      </main>
    </div>
  )
}

// ─── Widget adversaire en live ────────────────────────────────────────────────
function RivalWidget({ rival, myProgress }) {
  const { user: rivalUser, completed, total } = rival
  const pct     = total > 0 ? Math.round((completed / total) * 100) : 0
  const isAhead = pct > myProgress
  const isTied  = pct === myProgress

  return (
    <div className="mb-5 p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/40">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-base">⚔️</span>
          <span className="text-indigo-300 text-sm font-semibold">{rivalUser.name} en ce moment</span>
        </div>
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${
          isAhead ? 'bg-red-500/20 text-red-400' :
          isTied  ? 'bg-amber-500/20 text-amber-400' :
                   'bg-green-500/20 text-green-400'
        }`}>
          {isAhead ? '🤡 Tu es derrière' : isTied ? '⚖️ Égalité' : '🗿 Tu mènes'}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{ width: total > 0 ? `${pct}%` : '0%' }}
          />
        </div>
        <span className="text-indigo-300 text-xs font-bold shrink-0">
          {completed}/{total}
        </span>
      </div>
    </div>
  )
}

// ─── Carte d'un objectif ──────────────────────────────────────────────────────
function ObjectifCard({ objectif, completed, isSaving, isFirst, streak, onToggle }) {
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
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`font-semibold text-base leading-snug ${completed ? 'text-green-300' : 'text-white'}`}>
            {objectif.title}
          </p>
          {streak > 0 && (
            <span className="text-[11px] font-bold text-orange-400 shrink-0">🔥 {streak}j</span>
          )}
        </div>
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
