-- Remove accounting / payment-alert cron until the billing alert flow is finalized.
-- Job: notify-manager-payment-alerts
-- Function: public.notify_manager_payment_alerts()

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
end;
$$;

drop function if exists public.notify_manager_payment_alerts();
