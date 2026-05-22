// ============================================================
//  PaffToChad — Edge Function : Rapport hebdomadaire
//  Fichier : supabase/functions/weekly-report/index.ts
//
//  Déclenchement :
//  • Via cron Supabase (pg_cron) → tous les dimanches à 20h
//  • Ou via HTTP POST (pour tester manuellement)
//
//  Variables d'environnement à configurer dans Supabase Dashboard
//  > Project Settings > Edge Functions > Secrets :
//    SUPABASE_URL            → URL de votre projet
//    SUPABASE_SERVICE_KEY    → clé service_role (PAS anon !)
//    RESEND_API_KEY          → clé API Resend (https://resend.com)
//    EMAIL_FROM              → ex: "PaffToChad <noreply@votredomaine.com>"
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve }        from 'https://deno.land/std@0.177.0/http/server.ts'
import { format, subDays, startOfWeek, endOfWeek } from 'https://esm.sh/date-fns@3'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_KEY')!
)

serve(async (_req) => {
  try {
    // ── Période : lundi → dimanche de la semaine courante ──────────
    const now   = new Date()
    const start = startOfWeek(now, { weekStartsOn: 1 }) // Lundi
    const end   = endOfWeek(now,   { weekStartsOn: 1 }) // Dimanche

    const dateStart = format(start, 'yyyy-MM-dd')
    const dateEnd   = format(end,   'yyyy-MM-dd')

    // ── Récupérer les users ─────────────────────────────────────────
    const { data: users } = await supabase.from('users').select('id, name, email')

    // ── Récupérer les objectifs ─────────────────────────────────────
    const { data: objectifs } = await supabase
      .from('objectifs')
      .select('id, title, order_index')
      .order('order_index')

    if (!users?.length || !objectifs?.length) {
      return new Response('Rien à traiter.', { status: 200 })
    }

    // ── Calculer les stats pour chaque user ─────────────────────────
    const reports = await Promise.all(
      users.map(async (user) => {
        const { data: logs } = await supabase
          .from('logs')
          .select('objectif_id, completed')
          .eq('user_id', user.id)
          .gte('date', dateStart)
          .lte('date', dateEnd)

        const nbDays  = 7
        const stats   = objectifs.map(obj => {
          const objLogs   = (logs ?? []).filter(l => l.objectif_id === obj.id)
          const completed = objLogs.filter(l => l.completed).length
          const rate      = Math.round((completed / nbDays) * 100)
          return { title: obj.title, completed, rate }
        })

        const globalScore = Math.round(
          stats.reduce((acc, s) => acc + s.rate, 0) / stats.length
        )

        return { user, stats, globalScore, dateStart, dateEnd }
      })
    )

    // ── Envoyer l'email à chaque user via Resend ────────────────────
    const resendKey = Deno.env.get('RESEND_API_KEY')!
    const emailFrom = Deno.env.get('EMAIL_FROM') ?? 'PaffToChad <noreply@pafftochad.app>'

    await Promise.all(
      reports.map(async ({ user, stats, globalScore, dateStart, dateEnd }) => {
        const emoji = globalScore >= 80 ? '🏆' : globalScore >= 50 ? '💪' : '🔥'
        const html  = generateEmailHtml({ user, stats, globalScore, dateStart, dateEnd, emoji })

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from:    emailFrom,
            to:      [user.email],
            subject: `${emoji} Rapport PaffToChad — Semaine du ${dateStart}`,
            html
          })
        })

        if (!res.ok) {
          const body = await res.text()
          console.error(`Erreur envoi email à ${user.email}:`, body)
        } else {
          console.log(`Email envoyé à ${user.email}`)
        }
      })
    )

    return new Response(JSON.stringify({ ok: true, reports: reports.map(r => ({
      user:  r.user.name,
      score: r.globalScore
    }))}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})

// ── Générateur HTML d'email ───────────────────────────────────────────────────
function generateEmailHtml({ user, stats, globalScore, dateStart, dateEnd, emoji }) {
  const barColor = (rate: number) =>
    rate >= 80 ? '#22c55e' : rate >= 50 ? '#f59e0b' : '#ef4444'

  const rows = stats.map(s => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#e2e8f0;font-size:14px;">
        ${s.title}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #1e293b;text-align:right;">
        <div style="display:inline-block;background:${barColor(s.rate)}22;color:${barColor(s.rate)};
          font-weight:700;font-size:14px;padding:3px 10px;border-radius:8px;">
          ${s.rate}%
        </div>
      </td>
    </tr>
  `).join('')

  const scoreColor = barColor(globalScore)

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width"/></head>
    <body style="margin:0;padding:0;background:#020617;font-family:Inter,-apple-system,sans-serif;">
      <div style="max-width:480px;margin:0 auto;padding:32px 24px;">

        <!-- Header -->
        <div style="text-align:center;margin-bottom:32px;">
          <h1 style="margin:0;font-size:28px;font-weight:900;color:#ffffff;">
            Paff<span style="color:#d946ef;">To</span>Chad
          </h1>
          <p style="margin:8px 0 0;color:#64748b;font-size:13px;text-transform:uppercase;letter-spacing:0.1em;">
            Rapport hebdomadaire
          </p>
        </div>

        <!-- Score global -->
        <div style="background:#0f172a;border:1px solid #1e293b;border-radius:20px;padding:24px;margin-bottom:20px;text-align:center;">
          <p style="margin:0 0 4px;color:#94a3b8;font-size:13px;">Score de la semaine — ${user.name}</p>
          <p style="margin:0;font-size:52px;font-weight:900;color:${scoreColor};">${globalScore}%</p>
          <p style="margin:8px 0 0;color:#64748b;font-size:12px;">${dateStart} → ${dateEnd}</p>
        </div>

        <!-- Détail objectifs -->
        <div style="background:#0f172a;border:1px solid #1e293b;border-radius:20px;padding:20px 24px;margin-bottom:20px;">
          <h2 style="margin:0 0 16px;color:#ffffff;font-size:16px;font-weight:700;">Détail par objectif</h2>
          <table style="width:100%;border-collapse:collapse;">
            ${rows}
          </table>
        </div>

        <!-- Message motivationnel -->
        <div style="background:${scoreColor}11;border:1px solid ${scoreColor}33;border-radius:16px;padding:16px 20px;text-align:center;">
          <p style="margin:0;color:${scoreColor};font-weight:700;font-size:15px;">
            ${emoji} ${
              globalScore >= 80
                ? `${user.name} est en mode CHAD cette semaine !`
                : globalScore >= 50
                ? `Continue comme ça ${user.name}, tu y es presque !`
                : `${user.name}, il est temps de hausser le niveau. Let's go !`
            }
          </p>
        </div>

        <p style="text-align:center;margin-top:32px;color:#334155;font-size:11px;">
          PaffToChad · Rapport automatique du dimanche 20h
        </p>
      </div>
    </body>
    </html>
  `
}
