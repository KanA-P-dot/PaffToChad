import { subDays, format } from 'date-fns'
import { supabase } from './supabase'

/**
 * Calcule le nombre de jours consécutifs où tous les objectifs ont été complétés.
 * Si aujourd'hui est parfait, il est inclus. Sinon, on part d'hier.
 */
export async function fetchStreak(userId) {
  const { count: totalObjectifs } = await supabase
    .from('objectifs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (!totalObjectifs) return 0

  const since = format(subDays(new Date(), 90), 'yyyy-MM-dd')
  const { data: logs } = await supabase
    .from('logs')
    .select('date')
    .eq('user_id', userId)
    .eq('completed', true)
    .gte('date', since)

  const countByDate = {}
  logs?.forEach(l => { countByDate[l.date] = (countByDate[l.date] || 0) + 1 })

  let streak = 0
  let d = new Date()

  // Si aujourd'hui n'est pas encore parfait, on commence à hier
  const todayISO = format(d, 'yyyy-MM-dd')
  if ((countByDate[todayISO] || 0) < totalObjectifs) {
    d = subDays(d, 1)
  }

  while (streak < 90) {
    const iso = format(d, 'yyyy-MM-dd')
    if ((countByDate[iso] || 0) >= totalObjectifs) {
      streak++
      d = subDays(d, 1)
    } else {
      break
    }
  }

  return streak
}
