-- ============================================================
--  PaffToChad — Configuration pg_cron pour le rapport hebdo
--  À exécuter dans l'éditeur SQL de Supabase
--
--  Prérequis : activer l'extension pg_cron dans Supabase
--  Database > Extensions > pg_cron → Enable
-- ============================================================

-- Active l'extension (si pas déjà fait)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Supprime le job existant s'il y en a un (idempotent)
SELECT cron.unschedule('weekly-report')
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'weekly-report'
);

-- Programme le rapport tous les dimanches à 20h00 UTC
-- (ajustez le fuseau horaire si nécessaire : 20h Paris = 18h UTC en été / 19h en hiver)
SELECT cron.schedule(
    'weekly-report',                         -- nom du job
    '0 18 * * 0',                            -- Dimanche 18h UTC = 20h Paris (été)
    $$
    SELECT net.http_post(
        url    := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_functions_url') || '/weekly-report',
        headers := jsonb_build_object(
            'Content-Type',  'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_anon_key')
        ),
        body   := '{}'
    );
    $$
);

-- ── Alternative : déclencher directement via supabase.functions.invoke ─────────
-- Si pg_cron + net.http_post est complexe à configurer, utilisez un cron externe
-- comme GitHub Actions, Render Cron Jobs, ou cron-job.org pour appeler l'URL :
-- POST https://VOTRE_PROJECT.supabase.co/functions/v1/weekly-report
-- Header : Authorization: Bearer VOTRE_ANON_KEY
