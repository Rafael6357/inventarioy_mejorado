-- Eliminar cron job previo si existe (pg_cron ya está instalado)
SELECT cron.unschedule('cleanup-logs-cron');

-- Programar ejecución diaria a las 4:00 AM UTC
SELECT cron.schedule(
    'cleanup-logs-cron',
    '0 4 * * *',
    $$
    SELECT net.http_post(
        url := 'https://ybymcbwnjcgdoqrosqdw.supabase.co/functions/v1/cleanup-logs',
        headers := '{"Authorization": "Bearer inv2026_cleanup_cron_k3y_x9m2"}'::jsonb,
        body := '{}'::jsonb
    );
    $$
);
