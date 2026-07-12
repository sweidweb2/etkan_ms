-- Daily cron: move scheduled semesters with start_date <= today to in_progress,
-- and notify managers when any transitioned.

create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.start_scheduled_semesters()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today_utc date := (timezone('utc', now()))::date;
  v_count integer := 0;
  v_body text;
begin
  with started as (
    update public.semesters s
    set status = 'in_progress'
    where s.status = 'scheduled'
      and s.start_date is not null
      and s.start_date <= v_today_utc
    returning s.id, s.name, s.start_date
  )
  select
    count(*)::integer,
    case
      when count(*) = 0 then null
      else
        'The following semester'
        || case when count(*) = 1 then '' else 's' end
        || ' started on or before '
        || to_char(v_today_utc, 'YYYY-MM-DD')
        || ' UTC and '
        || case when count(*) = 1 then 'was' else 'were' end
        || ' set to In progress:'
        || E'\n'
        || string_agg(
          '- '
            || started.name
            || ' (start date '
            || to_char(started.start_date, 'YYYY-MM-DD')
            || ')',
          E'\n'
          order by started.start_date, started.name
        )
    end
  into v_count, v_body
  from started;

  if coalesce(v_count, 0) = 0 then
    return;
  end if;

  insert into public.notifications (
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
    'academic',
    'normal',
    case
      when v_count = 1 then 'Semester started'
      else 'Semesters started'
    end,
    v_body,
    '/manager/semesters',
    null
  );
end;
$$;

comment on function public.start_scheduled_semesters() is
  'Daily: sets scheduled semesters with start_date on or before today (UTC) to in_progress and notifies managers.';

select cron.schedule(
  'start-scheduled-semesters',
  '0 0 * * *',
  $$ select public.start_scheduled_semesters(); $$
);
