import { useState } from 'react'
import { format, subDays, differenceInCalendarDays, eachDayOfInterval, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { supabase } from '../lib/supabase'

const toISO = (d) => format(new Date(d), 'yyyy-MM-dd')

export default function StatsModule({ user, onBack }) {
  const today  = new Date()
  const [dateStart, setDateStart] = useState(toISO(subDays(today, 6)))
  const [dateEnd,   setDateEnd]   = useState(toISO(today))
  const [report, setReport]       = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)

  const compute = async () => {
    setLoading(true)
    setReport(null)
    setError(null)

    try {
      // Nombre de jours dans la période
      const start = parseISO(dateStart)
      const end   = parseISO(dateEnd)

      if (differenceInCalendarDays(end, start) < 0) {
        setError('La date de fin doit être après la date de début.')
        setLoading(false)
        return
      }

      const days = eachDayOfInterval({ start, end })
      const nbDays = days.length

      // Récupérer les objectifs de l'utilisateur
      const { data: objectifs } = await supabase
        .from('objectifs')
        .select('*')
        .eq('user_id', user.id)
        .order('order_index')

      // Récupérer les logs sur la période pour cet utilisateur
      const { data: logs, error: logsError } = await supabase
        .from('logs')
        .select('objectif_id, completed, date')
        .eq('user_id', user.id)
        .gte('date', dateStart)
        .lte('date', dateEnd)

      if (logsError) throw logsError

      // Calculer le % de réussite par objectif
      const stats = (objectifs ?? []).map(obj => {
        const objLogs    = (logs ?? []).filter(l => l.objectif_id === obj.id)
        const completed  = objLogs.filter(l => l.completed).length
        const rate       = nbDays > 0 ? Math.round((completed / nbDays) * 100) : 0
        return { ...obj, completed, nbDays, rate }
      })

      // Score global
      const totalPossible = (objectifs?.length ?? 0) * nbDays
      const totalDone     = stats.reduce((acc, s) => acc + s.completed, 0)
      const globalScore   = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0

      setReport({ stats, globalScore, nbDays, start, end })
    } catch (e) {
      setError(e.message ?? 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/60 px-5 py-4">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <button
            onClick={onBack}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">Rapport de stats</h2>
            <p className="text-slate-500 text-xs">{user.name}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 px-5 py-6 max-w-md mx-auto w-full">

        {/* Formulaire de période */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 mb-5">
          <h3 className="text-white font-semibold mb-4">Période d'analyse</h3>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5">Date de début</label>
              <input
                type="date"
                value={dateStart}
                max={dateEnd}
                onChange={e => setDateStart(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm
                  focus:outline-none focus:ring-2 focus:ring-chad-500 focus:border-transparent
                  [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5">Date de fin</label>
              <input
                type="date"
                value={dateEnd}
                min={dateStart}
                max={toISO(new Date())}
                onChange={e => setDateEnd(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm
                  focus:outline-none focus:ring-2 focus:ring-chad-500 focus:border-transparent
                  [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Raccourcis de période */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {[
              { label: '7j',  days: 6  },
              { label: '14j', days: 13 },
              { label: '30j', days: 29 },
            ].map(({ label, days }) => (
              <button
                key={label}
                onClick={() => { setDateStart(toISO(subDays(today, days))); setDateEnd(toISO(today)) }}
                className="px-3 py-1 rounded-lg bg-slate-800 text-slate-400 hover:bg-chad-500/20 hover:text-chad-300 text-xs font-medium transition-colors"
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={compute}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-chad-600 hover:bg-chad-500 disabled:opacity-50 disabled:cursor-wait
              text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Calcul en cours…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Calculer le rapport
              </>
            )}
          </button>
        </div>

        {/* Erreur */}
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-950/50 border border-red-800/50 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Résultats */}
        {report && <ReportCard report={report} user={user} />}
      </main>
    </div>
  )
}

function ReportCard({ report, user }) {
  const { stats, globalScore, nbDays, start, end } = report

  const scoreColor = globalScore >= 80
    ? 'text-green-400'
    : globalScore >= 50
    ? 'text-amber-400'
    : 'text-red-400'

  const ringColor = globalScore >= 80
    ? 'stroke-green-500'
    : globalScore >= 50
    ? 'stroke-amber-500'
    : 'stroke-red-500'

  const circumference = 2 * Math.PI * 38
  const dashOffset    = circumference - (globalScore / 100) * circumference

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* En-tête rapport */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-white font-bold text-lg">Rapport</h3>
          <p className="text-slate-500 text-xs capitalize">
            {format(start, 'd MMM', { locale: fr })} → {format(end, 'd MMM yyyy', { locale: fr })} · {nbDays} jour{nbDays > 1 ? 's' : ''}
          </p>
        </div>

        {/* Score global en cercle */}
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 88 88">
            <circle cx="44" cy="44" r="38" fill="none" stroke="#1e293b" strokeWidth="8" />
            <circle
              cx="44" cy="44" r="38" fill="none" strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className={`${ringColor} transition-all duration-700`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-xl font-black ${scoreColor}`}>{globalScore}%</span>
          </div>
        </div>
      </div>

      {/* Détail par objectif */}
      <div className="flex flex-col gap-3">
        {stats.map(stat => (
          <ObjectifStat key={stat.id} stat={stat} />
        ))}
      </div>

      {/* Message motivationnel */}
      <div className={`mt-5 p-3 rounded-xl text-center text-sm font-semibold ${
        globalScore >= 80
          ? 'bg-green-950/50 text-green-400 border border-green-800/50'
          : globalScore >= 50
          ? 'bg-amber-950/50 text-amber-400 border border-amber-800/50'
          : 'bg-red-950/50 text-red-400 border border-red-800/50'
      }`}>
        {globalScore >= 80
          ? `🏆 ${user.name} est actuellement en mode CHAD absolu.`
          : globalScore >= 50
          ? `💪 ${user.name} progresse — continue comme ça !`
          : `🔥 ${user.name} doit relever le niveau. Let's go.`
        }
      </div>
    </div>
  )
}

function ObjectifStat({ stat }) {
  const barColor = stat.rate >= 80
    ? 'bg-green-500'
    : stat.rate >= 50
    ? 'bg-amber-500'
    : 'bg-red-500'

  return (
    <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
      <div className="flex justify-between items-start mb-2">
        <p className="text-white text-sm font-medium leading-snug flex-1 pr-3">{stat.title}</p>
        <span className={`text-sm font-black flex-shrink-0 ${
          stat.rate >= 80 ? 'text-green-400' : stat.rate >= 50 ? 'text-amber-400' : 'text-red-400'
        }`}>
          {stat.rate}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${stat.rate}%` }}
        />
      </div>
      <p className="text-slate-500 text-xs mt-1.5">
        {stat.completed}/{stat.nbDays} jour{stat.nbDays > 1 ? 's' : ''} réussi{stat.completed > 1 ? 's' : ''}
      </p>
    </div>
  )
}
