-- Run after setting the two named Vault secrets and deploying the Edge Function.
-- Supabase Cron runs in UTC. 08:00 and 12:00 UTC are 17:00 and 21:00 in Seoul.
do $$
begin
  if (select count(distinct name) from vault.decrypted_secrets
      where name in ('execution_push_url', 'execution_push_cron_secret')
        and length(decrypted_secret) > 0) <> 2 then
    raise exception 'Set execution_push_url and execution_push_cron_secret in Vault before scheduling';
  end if;
end
$$;

select cron.schedule(
  'send-execution-reminders',
  '0,5,10,15,20 8,12 * * *',
  $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'execution_push_url')
        || '/functions/v1/send-execution-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-execution-push-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'execution_push_cron_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
  $job$
);
