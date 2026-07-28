-- Idempotent cleanup of accounting payment-alert cron + function.
-- Safe if already removed by 20260717000000_drop_cron_notify_manager_payment_alerts.sql.

do $$
declare
  v_jobid bigint;
begin
  select j.jobid
    into v_jobid
  from cron.job j
  where j.jobname = 'notify-manager-payment-alerts'
  limit 1;

  if v_jobid is not null then
    perform cron.unschedule(v_jobid);
  end if;
exception
  when undefined_table then
    -- cron.job missing (extension not installed) — ignore
    null;
end $$;

drop function if exists public.notify_manager_payment_alerts();
