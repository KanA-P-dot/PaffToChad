// Clé à bumper à chaque nouvelle mise à jour pour re-déclencher l'affichage
export const PATCH_NOTE_KEY = 'ptc_patchnote_v1.1'

const FEATURES = [
  {
    icon: '⚔️',
    title: 'Adversaire en live',
    desc: "La progression de ton rival s'affiche en temps réel sous ta barre du jour. Tu sais toujours si tu mènes ou si tu dois accélérer.",
    color: 'text-indigo-400',
    bg: 'bg-indigo-950/50 border-indigo-800/40',
  },
  {
    icon: '🔥',
    title: 'Streak par objectif',
    desc: 'Chaque habitude affiche maintenant son propre compteur de jours consécutifs. Plus besoin d\'être parfait pour garder une flamme.',
    color: 'text-orange-400',
    bg: 'bg-orange-950/40 border-orange-800/30',
  },
  {
    icon: '🎊',
    title: 'Confettis journée parfaite',
    desc: 'Coche ton dernier objectif et profite de la récompense. Chad mode activé dans toute sa splendeur.',
    color: 'text-chad-400',
    bg: 'bg-chad-900/30 border-chad-800/30',
  },
]

export default function PatchNoteModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-4 sm:pb-0"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/60 rounded-3xl overflow-hidden shadow-2xl animate-slide-up">

        {/* En-tête */}
        <div className="relative px-6 pt-7 pb-5 border-b border-slate-800">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-1">Mise à jour</p>
              <h2 className="text-white text-2xl font-black leading-tight">
                Nouveautés <span className="text-chad-500">PaffToChad</span>
              </h2>
            </div>
            <span className="mt-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-chad-500/15 text-chad-400 border border-chad-500/25 shrink-0">
              v1.1
            </span>
          </div>
        </div>

        {/* Liste des features */}
        <div className="px-6 py-5 flex flex-col gap-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className={`flex items-start gap-4 p-4 rounded-2xl border ${f.bg}`}
            >
              <span className="text-2xl leading-none mt-0.5 shrink-0">{f.icon}</span>
              <div>
                <p className={`font-bold text-sm leading-snug ${f.color}`}>{f.title}</p>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="px-6 pb-7">
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl bg-chad-500 hover:bg-chad-400 active:scale-[0.98] transition-all text-white font-bold text-base tracking-tight"
          >
            C'est parti 🚀
          </button>
        </div>
      </div>
    </div>
  )
}
