-- Drain stalled task-attachment clone jobs every 5 minutes via pg_cron → Next API.
-- Reuses vault secrets database_backup_cron_url / database_backup_cron_secret
-- (same host + CRON_SECRET) but targets /api/cron/task-attachment-clone.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create or replace function public.run_task_attachment_clone_drain()
returns bigint
language plpgsql
security definer
set search_path = public, net, vault, extensions
as $$
declare
  cron_url text;
  cron_secret text;
  request_id bigint;
  clone_url text;
begin
  select ds.decrypted_secret
  into cron_url
  from vault.decrypted_secrets as ds
  where ds.name = 'database_backup_cron_url'
  limit 1;

  select ds.decrypted_secret
  into cron_secret
  from vault.decrypted_secrets as ds
  where ds.name = 'database_backup_cron_secret'
  limit 1;

  if cron_url is null or btrim(cron_url) = '' then
    raise exception
      'Missing vault secret database_backup_cron_url (set once per environment).';
  end if;

  if cron_secret is null or btrim(cron_secret) = '' then
    raise exception
      'Missing vault secret database_backup_cron_secret (must match app CRON_SECRET).';
  end if;

  -- Prefer replacing the known backup path; otherwise swap the last path segment.
  clone_url := regexp_replace(
    btrim(cron_url),
    '/api/cron/database-backup/?$',
    '/api/cron/task-attachment-clone'
  );

  if clone_url = btrim(cron_url) then
    clone_url := regexp_replace(
      btrim(cron_url),
      '/[^/]+/?$',
      '/task-attachment-clone'
    );
  end if;

  request_id := net.http_post(
    url := clone_url,
    body := jsonb_build_object('source', 'pg_cron', 'job', 'task-attachment-clone-drain'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || btrim(cron_secret)
    ),
    timeout_milliseconds := 120000
  );

  return request_id;
end;
$$;

comment on function public.run_task_attachment_clone_drain() is
  'pg_cron: HTTP POST to Next /api/cron/task-attachment-clone using vault secrets (same as weekly DB backup).';

revoke all on function public.run_task_attachment_clone_drain() from public;
grant execute on function public.run_task_attachment_clone_drain() to postgres;

do $$
begin
  if not exists (
    select 1
    from cron.job
    where jobname = 'task-attachment-clone-drain'
  ) then
    perform cron.schedule(
      'task-attachment-clone-drain',
      '*/5 * * * *',
      $cron$ select public.run_task_attachment_clone_drain(); $cron$
    );
  end if;
end $$;
