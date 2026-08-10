-- Gift delivery cron: every 15 minutes, invoke the send-scheduled-gifts
-- edge function, which flips due scheduled gifts to 'sent', emails the
-- recipient their claim link, and expires gifts past expires_at.
--
-- The project URL and anon key are read from Vault at execution time so no
-- credentials live in migration history. One-time setup (already done for
-- this project, needed again for a fresh environment):
--   select vault.create_secret('<https://PROJECT.supabase.co>', 'project_url');
--   select vault.create_secret('<anon key>', 'anon_key');

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Re-create the job idempotently
do $$
begin
  if exists (select 1 from cron.job where jobname = 'deliver-gifts') then
    perform cron.unschedule('deliver-gifts');
  end if;
end $$;

select cron.schedule(
  'deliver-gifts',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/send-scheduled-gifts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' ||
        (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
