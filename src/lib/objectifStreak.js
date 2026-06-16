import { subDays, format } from 'date-fns'
import { supabase } from './supabase'

/**
 * Calcule le streak individuel de chaque objectif d'un utilisateur.
 * Même logique que fetchStreak : si aujourd'hui est complété, il compte ;
 * sinon on part d'hier.
 * @returns {{ [objectifId: string]: number }}
 */
export async function fetchObjectifStreaks(userId) {
  const since    = format(subDays(new Date(), 90), 'yyyy-MM-dd')
  const todayISO = format(new Date(), 'yyyy-MM-dd')

  const { data: objectifs } = await supabase
    .from('objectifs')
    .select('id')
    .eq('user_id', userId)

  if (!objectifs?.length) return {}

  const { data: logs } = await supabase
    .from('logs')
    .select('objectif_id, date')
    .eq('user_id', userId)
    .eq('completed', true)
    .gte('date', since)
    .in('objectif_id', objectifs.map(o => o.id))

  const byObjectif = {}
  logs?.forEach(l => {
    if (!byObjectif[l.objectif_id]) byObjectif[l.objectif_id] = new Set()
    byObjectif[l.objectif_id].add(l.date)
  })

  const streaks = {}
  for (const obj of objectifs) {
    const dates = byObjectif[obj.id] || new Set()
    let streak = 0
    let d = new Date()

    if (!dates.has(todayISO)) d = subDays(d, 1)

    while (streak < 90) {
      const iso = format(d, 'yyyy-MM-dd')
      if (dates.has(iso)) {
        streak++
        d = subDays(d, 1)
      } else {
        break
      }
    }

    streaks[obj.id] = streak
  }

  return streaks
}
