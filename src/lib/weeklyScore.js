import { startOfWeek, eachDayOfInterval, format } from 'date-fns'
import { supabase } from './supabase'

/**
 * Récupère et calcule les scores paff/chad de la semaine en cours.
 * Chaque jour, le user avec le meilleur taux de complétion gagne un 🗿 chad,
 * l'autre gagne un 🤡 paff. En cas d'égalité, personne ne gagne.
 *
 * @returns {{ scores: { [userId]: { chad: number, paff: number } }, users: User[] } | null}
 */
export async function fetchWeeklyScores() {
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }) // Lundi

  const { data: users } = await supabase.from('users').select('id, name')
  if (!users || users.length < 2) return null

  const days = eachDayOfInterval({ start: weekStart, end: now })
  const weekStartStr = format(weekStart, 'yyyy-MM-dd')
  const todayStr     = format(now, 'yyyy-MM-dd')

  // Récupère objectifs + logs de la semaine pour chaque user en parallèle
  const userDataArr = await Promise.all(
    users.map(async (u) => {
      const [{ data: objs }, { data: logs }] = await Promise.all([
        supabase.from('objectifs').select('id').eq('user_id', u.id),
        supabase
          .from('logs')
          .select('date, completed')
          .eq('user_id', u.id)
          .gte('date', weekStartStr)
          .lte('date', todayStr),
      ])
      return {
        id:        u.id,
        name:      u.name,
        totalObjs: objs?.length ?? 0,
        logs:      logs ?? [],
      }
    })
  )

  const scores = {}
  users.forEach(u => { scores[u.id] = { chad: 0, paff: 0 } })

  for (const day of days) {
    const dateStr  = format(day, 'yyyy-MM-dd')
    const dayScores = userDataArr.map(r => {
      const total = r.totalObjs
      const done  = r.logs.filter(l => l.date === dateStr && l.completed).length
      return { id: r.id, pct: total > 0 ? done / total : 0, total }
    })

    if (dayScores.length === 2) {
      const [a, b] = dayScores
      // On ne compte que si au moins un user a des objectifs
      if (a.total > 0 || b.total > 0) {
        if (a.pct > b.pct)      { scores[a.id].chad++; scores[b.id].paff++ }
        else if (b.pct > a.pct) { scores[b.id].chad++; scores[a.id].paff++ }
        // égalité → personne ne gagne de badge
      }
    }
  }

  return { scores, users }
}
