-- Scheduled roster sync (run once in the Supabase SQL editor AFTER the Edge
-- Functions are deployed and ROSTER_SYNC_SECRET is set). Not a migration,
-- because it needs your project URL and secret, which must not be committed.
--
-- Polls every 10 minutes (within the 5–15 minute guidance; Google Sheets'
-- read quota is far above this). Updates are therefore not instant.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Store the secret in Vault instead of in the job text:
--   select vault.create_secret('<same value as ROSTER_SYNC_SECRET>', 'roster_sync_secret');

select cron.schedule(
  'tpd-roster-sync',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/roster-sync',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'roster_sync_secret')
    ),
    body := '{"mode":"apply"}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- To stop: select cron.unschedule('tpd-roster-sync');
