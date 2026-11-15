-- Weekly SQL DB backup via pg_cron → pg_net → Next /api/cron/database-backup.
-- Requires vault secrets (set once per environment, not committed):
--   database_backup_cron_url    e.g. http://host.docker.internal:3000/api/cron/database-backup
--                               or https://etkan.org/api/cron/database-backup
--   database_backup_cron_secret matching app env CRON_SECRET

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create or replace function public.run_weekly_database_sql_backup()
returns bigint
language plpgsql
security definer
set search_path = public, net, vault, extensions
as $$
declare
  cron_url text;
  cron_secret text;
  request_id bigint;
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

  -- Long timeout: full SQL export + Storage upload can take minutes.
  request_id := net.http_post(
    url := btrim(cron_url),
    body := jsonb_build_object('source', 'pg_cron', 'job', 'weekly-database-sql-backup'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || btrim(cron_secret)
    ),
    timeout_milliseconds := 300000
  );

  return request_id;
end;
$$;

comment on function public.run_weekly_database_sql_backup() is
  'pg_cron weekly job: HTTP POST to Next /api/cron/database-backup using vault secrets database_backup_cron_url + database_backup_cron_secret. Uploads public-tables + auth SQL to Storage bucket database-backups (no media).';

revoke all on function public.run_weekly_database_sql_backup() from public;
grant execute on function public.run_weekly_database_sql_backup() to postgres;

do $$
begin
  if not exists (
    select 1
    from cron.job
    where jobname = 'weekly-database-sql-backup'
  ) then
    perform cron.schedule(
      'weekly-database-sql-backup',
      '0 3 * * 0',
      $cron$ select public.run_weekly_database_sql_backup(); $cron$
    );
  end if;
end $$;
