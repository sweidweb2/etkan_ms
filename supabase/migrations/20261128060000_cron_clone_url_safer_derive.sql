-- Safer task-attachment clone drain URL:
-- 1) Prefer dedicated vault secret task_attachment_clone_cron_url
-- 2) Else derive from database_backup_cron_url via /api/cron/ prefix or origin join
-- Reuses database_backup_cron_secret for Bearer auth.

create or replace function public.run_task_attachment_clone_drain()
returns bigint
language plpgsql
security definer
set search_path = public, net, vault, extensions
as $$
declare
  cron_url text;
  cron_secret text;
  dedicated_url text;
  request_id bigint;
  clone_url text;
  base_url text;
begin
  select ds.decrypted_secret
  into dedicated_url
  from vault.decrypted_secrets as ds
  where ds.name = 'task_attachment_clone_cron_url'
  limit 1;

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

  if cron_secret is null or btrim(cron_secret) = '' then
    raise exception
      'Missing vault secret database_backup_cron_secret (must match app CRON_SECRET).';
  end if;

  if dedicated_url is not null and btrim(dedicated_url) <> '' then
    clone_url := btrim(dedicated_url);
  else
    if cron_url is null or btrim(cron_url) = '' then
      raise exception
        'Missing vault secret task_attachment_clone_cron_url (or database_backup_cron_url fallback).';
    end if;

    base_url := btrim(cron_url);

    if base_url ~ '/api/cron/' then
      clone_url := regexp_replace(
        base_url,
        '/api/cron/.*$',
        '/api/cron/task-attachment-clone'
      );
    else
      clone_url := rtrim(base_url, '/') || '/api/cron/task-attachment-clone';
    end if;
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
  'pg_cron: HTTP POST to Next /api/cron/task-attachment-clone. Prefers vault task_attachment_clone_cron_url; else derives from database_backup_cron_url.';
