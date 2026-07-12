-- Weekly Saturday cron: notify managers about payment alerts + missed scheduled payments.
-- Alert rules must stay aligned with lib/constants/manager-accounting-payment-alert.ts:
--   - enrolled students only
--   - under $100 paid total (always eligible, even when scheduled_payments exist)
--   - L1–L6 from months since latest payment (paid days 1–30 this month → no late level;
--     never paid → L6; else clamp calendar months to 1–6)
--   - L levels are suppressed when the subscription has any scheduled_payments row
-- Per account: under $100 wins exclusively over any late level.
-- Also lists scheduled_payments with status = 'missed'.

create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.notify_manager_payment_alerts()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today_utc date := (timezone('utc', now()))::date;
  v_now timestamptz := timezone('utc', now());
  v_alert_count integer := 0;
  v_missed_count integer := 0;
  v_priority text := 'low';
  v_body text;
  v_payment_body text;
  v_missed_body text;
  v_under_100_count integer := 0;
  v_l5_or_l6_count integer := 0;
  v_l3_or_l4_count integer := 0;
begin
  -- Dedup: one system digest per UTC day (job runs Saturdays).
  if exists (
    select 1
    from notifications n
    where n.audience = 'manager'
      and n.category = 'billing'
      and n.title = 'Weekly payment alerts'
      and n.created_by is null
      and (n.created_at at time zone 'utc')::date = v_today_utc
  ) then
    return;
  end if;

  with enrollment_billing as (
    select
      sp.full_name as student_name,
      sem.name as semester_name,
      coalesce(pay.total_paid, 0)::numeric as total_paid,
      pay.latest_paid_at,
      pay.paid_this_month,
      exists (
        select 1
        from scheduled_payments spay
        where spay.subscribed_semester_id = sub.id
      ) as has_scheduled_payments
    from student_semester ss
    join student_profiles sp on sp.id = ss.student_profile_id
    join semesters sem on sem.id = ss.semester_id
    left join accounts a on a.user_id = sp.user_id
    left join subscribed_semesters sub
      on sub.account_id = a.id
     and sub.semester_id = ss.semester_id
    left join lateral (
      select
        coalesce(sum(p.amount), 0)::numeric as total_paid,
        max(p.paid_at) as latest_paid_at,
        bool_or(
          p.paid_at is not null
          and extract(year from p.paid_at)::integer
            = extract(year from v_now)::integer
          and extract(month from p.paid_at)::integer
            = extract(month from v_now)::integer
          and extract(day from p.paid_at)::integer between 1 and 30
        ) as paid_this_month
      from payments p
      where p.subscribed_semester_id = sub.id
    ) pay on true
  ),
  scored as (
    select
      student_name,
      semester_name,
      (total_paid < 100) as low_payment,
      has_scheduled_payments,
      case
        when coalesce(paid_this_month, false) then null
        when latest_paid_at is null then 6
        else least(
          6,
          greatest(
            1,
            (
              (extract(year from v_now)::integer
                - extract(year from latest_paid_at)::integer)
              * 12
              + (
                extract(month from v_now)::integer
                - extract(month from latest_paid_at)::integer
              )
            )
          )
        )
      end as missed_months
    from enrollment_billing
  ),
  winners as (
    select
      student_name,
      semester_name,
      case
        when low_payment then 'under_100'
        when missed_months is not null
          and not coalesce(has_scheduled_payments, false)
          then 'L' || missed_months::text
        else null
      end as reason_key,
      case
        when low_payment then 0
        when missed_months is not null
          and not coalesce(has_scheduled_payments, false)
          then (7 - missed_months)
        else null
      end as sort_group,
      case
        when low_payment then 'Under $100'
        when missed_months = 1
          and not coalesce(has_scheduled_payments, false)
          then 'No payment this month'
        when missed_months = 2
          and not coalesce(has_scheduled_payments, false)
          then 'No payment in the last 2 months'
        when missed_months = 3
          and not coalesce(has_scheduled_payments, false)
          then 'No payment in the last 3 months'
        when missed_months = 4
          and not coalesce(has_scheduled_payments, false)
          then 'No payment in the last 4 months'
        when missed_months = 5
          and not coalesce(has_scheduled_payments, false)
          then 'No payment in the last 5 months'
        when missed_months = 6
          and not coalesce(has_scheduled_payments, false)
          then 'No payment in the last 6 months'
        else null
      end as reason_label
    from scored
  ),
  flagged as (
    select *
    from winners
    where reason_key is not null
  ),
  grouped as (
    select
      reason_key,
      reason_label,
      sort_group,
      count(*)::integer as student_count,
      string_agg(
        '- ' || student_name || ' — ' || semester_name,
        E'\n'
        order by student_name, semester_name
      ) as lines
    from flagged
    group by reason_key, reason_label, sort_group
  ),
  digest as (
    select
      coalesce(
        string_agg(
          reason_label || ' (' || student_count || '):' || E'\n' || lines,
          E'\n\n'
          order by sort_group
        ),
        ''
      ) as body_sections,
      coalesce(sum(student_count), 0)::integer as total_count,
      coalesce(
        sum(case when reason_key = 'under_100' then student_count else 0 end),
        0
      )::integer as under_100_count,
      coalesce(
        sum(
          case
            when reason_key in ('L5', 'L6') then student_count
            else 0
          end
        ),
        0
      )::integer as l5_or_l6_count,
      coalesce(
        sum(
          case
            when reason_key in ('L3', 'L4') then student_count
            else 0
          end
        ),
        0
      )::integer as l3_or_l4_count
    from grouped
  )
  select
    d.total_count,
    d.under_100_count,
    d.l5_or_l6_count,
    d.l3_or_l4_count,
    case
      when d.total_count = 0 then null
      else
        'Payment alerts ('
        || d.total_count
        || ' student'
        || case when d.total_count = 1 then '' else 's' end
        || '):'
        || E'\n\n'
        || d.body_sections
    end
  into
    v_alert_count,
    v_under_100_count,
    v_l5_or_l6_count,
    v_l3_or_l4_count,
    v_payment_body
  from digest d;

  select
    count(*)::integer,
    case
      when count(*) = 0 then null
      else
        'Missed scheduled payments ('
        || count(*)::text
        || '):'
        || E'\n'
        || string_agg(
          '- '
            || sp.full_name
            || ' — '
            || coalesce(sem.name, '—')
            || ' — '
            || to_char(spay.payment_date at time zone 'utc', 'YYYY-MM-DD')
            || case
              when spay.amount is not null then ' — $' || trim(to_char(spay.amount, 'FM999999990.00'))
              else ''
            end,
          E'\n'
          order by spay.payment_date, sp.full_name
        )
    end
  into v_missed_count, v_missed_body
  from scheduled_payments spay
  join subscribed_semesters sub on sub.id = spay.subscribed_semester_id
  join accounts a on a.id = sub.account_id
  join student_profiles sp on sp.user_id = a.user_id
  left join semesters sem on sem.id = sub.semester_id
  where spay.status = 'missed';

  if coalesce(v_alert_count, 0) = 0 and coalesce(v_missed_count, 0) = 0 then
    return;
  end if;

  v_body :=
    'Weekly payment alerts for '
    || to_char(v_today_utc, 'YYYY-MM-DD')
    || ' UTC'
    || E'\n\n'
    || coalesce(v_payment_body, '')
    || case
      when v_payment_body is not null and v_missed_body is not null then E'\n\n'
      else ''
    end
    || coalesce(v_missed_body, '');

  if v_under_100_count > 0 or v_l5_or_l6_count > 0 or v_missed_count > 0 then
    v_priority := 'high';
  elsif v_l3_or_l4_count > 0 then
    v_priority := 'normal';
  else
    v_priority := 'low';
  end if;

  insert into notifications (
    recipient_id,
    audience,
    category,
    priority,
    title,
    body,
    action_href,
    created_by
  ) values (
    null,
    'manager',
    'billing',
    v_priority,
    'Weekly payment alerts',
    v_body,
    '/manager/accounting',
    null
  );
end;
$$;

comment on function public.notify_manager_payment_alerts() is
  'Weekly Saturday digest for managers: under $100 and L1–L6 payment alerts (L suppressed when scheduled_payments exist), plus missed scheduled payment reminders. Keep alert rules aligned with manager-accounting-payment-alert.ts.';

-- Re-schedule as weekly Saturday (replace any prior daily schedule for this job name).
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

select cron.schedule(
  'notify-manager-payment-alerts',
  '0 0 * * 6',
  $$ select public.notify_manager_payment_alerts(); $$
);
