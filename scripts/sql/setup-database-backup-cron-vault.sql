-- One-time per Supabase stack (local / staging / prod).
-- Sets vault secrets used by public.run_weekly_database_sql_backup().
--
-- Replace the two values below, then:
--   docker exec -i supabase_db_etkan_ms psql -U postgres < scripts/sql/setup-database-backup-cron-vault.sql
-- Staging: supabase_db_etkan_ms  → often http://host.docker.internal:3001/api/cron/database-backup
--   or https://staging.etkan.org/api/cron/database-backup
-- Prod:    supabase_db_etkan_ms_prod → https://etkan.org/api/cron/database-backup
-- App .env must set the same CRON_SECRET.

do $$
declare
  url_id uuid;
  secret_id uuid;
  -- EDIT THESE:
  cron_url text := 'http://host.docker.internal:3000/api/cron/database-backup';
  cron_secret text := 'replace-with-long-random-secret';
begin
  if cron_secret = 'replace-with-long-random-secret' then
    raise exception 'Edit cron_secret in setup-database-backup-cron-vault.sql before running.';
  end if;

  select id into url_id from vault.secrets where name = 'database_backup_cron_url';
  if url_id is null then
    perform vault.create_secret(
      cron_url,
      'database_backup_cron_url',
      'Next URL for weekly SQL database backup cron'
    );
  else
    perform vault.update_secret(url_id, cron_url);
  end if;

  select id into secret_id from vault.secrets where name = 'database_backup_cron_secret';
  if secret_id is null then
    perform vault.create_secret(
      cron_secret,
      'database_backup_cron_secret',
      'Bearer token; must match app CRON_SECRET'
    );
  else
    perform vault.update_secret(secret_id, cron_secret);
  end if;
end $$;

-- Smoke (optional): select public.run_weekly_database_sql_backup();
-- Then: select * from net._http_response order by created desc limit 5;
