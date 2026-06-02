import { useEffect, useState } from 'react'
import { fetchWeeklyScores } from '../lib/weeklyScore'

/** Vrai le dimanche à partir de 20h */
function isSundayReveal() {
  const now = new Date()
  return now.getDay() === 0 && now.getHours() >= 20
}

export default function WeeklyScoreWidget({ currentUserId }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const isReveal = isSundayReveal()

  useEffect(() => {
    fetchWeeklyScores().then(result => {
      setData(result)
      setLoading(false)
    })
  }, [currentUserId])

  if (loading) {
    return <div className="h-20 rounded-2xl bg-slate-900 animate-pulse border border-slate-800 mb-6" />
  }
  if (!data) return null

  const { scores, users } = data
  const userList = users.map(u => ({ ...u, ...scores[u.id] }))

  // Gagnants de la semaine
  const maxChad    = Math.max(...userList.map(u => u.chad))
  const chadWinner = [...userList].sort((a, b) => b.chad - a.chad)[0]
  const paffWinner = [...userList].sort((a, b) => b.paff - a.paff)[0]
  const isTie      = userList.filter(u => u.chad === maxChad).length > 1
  const bothZero   = userList.every(u => u.chad === 0 && u.paff === 0)

  /* ─── DIMANCHE 20H : Révélation ──────────────────────────────────────── */
  if (isReveal) {
    return (
      <div className="mb-6 relative rounded-2xl border-2 border-chad-500/60 bg-slate-900 overflow-hidden
                      shadow-[0_0_30px_-5px] shadow-chad-500/30">
        {/* Bandeau titre */}
        <div className="px-4 py-3 bg-chad-500/10 border-b border-chad-500/20 text-center">
          <p className="text-chad-300 font-black text-sm uppercase tracking-widest">
            Résultats de la semaine
          </p>
        </div>

        <div className="p-4 flex flex-col gap-3">
          {bothZero ? (
            <div className="text-center py-4">
              <p className="text-4xl mb-3">😶</p>
              <p className="text-white font-bold">Personne n'a joué cette semaine…</p>
              <p className="text-slate-400 text-sm mt-1">Revenez la semaine prochaine !</p>
            </div>
          ) : isTie ? (
            <div className="text-center py-4">
              <p className="text-4xl mb-3">🤝</p>
              <p className="text-white font-bold text-lg">Égalité parfaite !</p>
              <p className="text-slate-400 text-sm mt-1">
                {maxChad} victoire{maxChad > 1 ? 's' : ''} chacun
              </p>
            </div>
          ) : (
            <>
              {/* Chad de la semaine */}
              <div className="flex items-center gap-4 p-3 rounded-xl bg-amber-950/30 border border-amber-700/30">
                <span className="text-4xl flex-shrink-0">🗿</span>
                <div>
                  <p className="text-amber-400 text-[11px] font-bold uppercase tracking-widest mb-0.5">
                    Chad de la semaine
                  </p>
                  <p className="text-white font-black text-xl leading-tight">{chadWinner.name}</p>
                  <p className="text-amber-600 text-xs mt-0.5">
                    {chadWinner.chad} victoire{chadWinner.chad > 1 ? 's' : ''} cette semaine
                  </p>
                </div>
              </div>

              {/* Paff de la semaine */}
              <div className="flex items-center gap-4 p-3 rounded-xl bg-red-950/30 border border-red-800/30">
                <span className="text-4xl flex-shrink-0">🤡</span>
                <div>
                  <p className="text-red-400 text-[11px] font-bold uppercase tracking-widest mb-0.5">
                    Paff de la semaine
                  </p>
                  <p className="text-white font-black text-xl leading-tight">{paffWinner.name}</p>
                  <p className="text-red-600 text-xs mt-0.5">
                    {paffWinner.paff} défaite{paffWinner.paff > 1 ? 's' : ''} cette semaine
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  /* ─── VUE NORMALE : Score courant de la semaine ───────────────────────── */
  return (
    <div className="mb-6 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">
          Score de la semaine
        </p>
        {bothZero && (
          <p className="text-slate-600 text-xs">Aucun match encore</p>
        )}
      </div>

      <div className={`p-3 grid gap-2 ${userList.length > 2 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {userList.map(u => {
          const isMe = u.id === currentUserId
          return (
            <div
              key={u.id}
              className={`rounded-xl p-3 border transition-colors ${
                isMe
                  ? 'bg-slate-800 border-slate-600'
                  : 'bg-slate-800/40 border-slate-800'
              }`}
            >
              <p className={`font-semibold text-sm mb-2 truncate ${isMe ? 'text-white' : 'text-slate-400'}`}>
                {u.name}
                {isMe && <span className="ml-1.5 text-[10px] text-slate-500 font-normal">toi</span>}
              </p>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-sm">
                  <span>🗿</span>
                  <span className={`font-bold ${u.chad > 0 ? 'text-amber-300' : 'text-slate-500'}`}>
                    {u.chad}
                  </span>
                </span>
                <span className="flex items-center gap-1 text-sm">
                  <span>🤡</span>
                  <span className={`font-bold ${u.paff > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                    {u.paff}
                  </span>
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
