-- Phase 45: copy last week's weekly schedule slots in one insert-select (not per-slot REST inserts).

create or replace function public.copy_weekly_schedule_from_last_week(p_week_start date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last_week_start date;
  v_last_week_end date;
  v_candidate_count integer := 0;
  v_created_count integer := 0;
begin
  if p_week_start is null then
    return jsonb_build_object('created_count', 0, 'skipped_count', 0);
  end if;

  v_last_week_start := p_week_start - 7;
  v_last_week_end := p_week_start - 1;

  with source as (
    select
      s.name,
      s.type,
      (s.slot_date + interval '7 days')::date as slot_date,
      s.start_time,
      s.end_time,
      s.color,
      lower(trim(s.name)) as name_key
    from public.weekly_schedule_slots s
    where s.slot_date >= v_last_week_start
      and s.slot_date <= v_last_week_end
  ),
  deduped as (
    select distinct on (name_key, slot_date, start_time, end_time)
      name,
      type,
      slot_date,
      start_time,
      end_time,
      color,
      name_key
    from source
    order by name_key, slot_date, start_time, end_time, name
  ),
  candidates as (
    select d.name, d.type, d.slot_date, d.start_time, d.end_time, d.color
    from deduped d
    where not exists (
      select 1
      from public.weekly_schedule_slots t
      where lower(trim(t.name)) = d.name_key
        and t.slot_date = d.slot_date
        and t.start_time = d.start_time
        and t.end_time = d.end_time
    )
  ),
  inserted as (
    insert into public.weekly_schedule_slots (
      name,
      type,
      slot_date,
      start_time,
      end_time,
      color,
      updated_at
    )
    select
      c.name,
      c.type,
      c.slot_date,
      c.start_time,
      c.end_time,
      c.color,
      now()
    from candidates c
    returning id
  )
  select
    (select count(*) from deduped),
    (select count(*) from inserted)
  into v_candidate_count, v_created_count;

  return jsonb_build_object(
    'created_count', coalesce(v_created_count, 0),
    'skipped_count', greatest(
      coalesce(v_candidate_count, 0) - coalesce(v_created_count, 0),
      0
    )
  );
end;
$$;

comment on function public.copy_weekly_schedule_from_last_week(date) is
  'Copy weekly_schedule_slots from the week before p_week_start into p_week_start..+6. Skips duplicates; single transaction.';

revoke all on function public.copy_weekly_schedule_from_last_week(date) from public;
grant execute on function public.copy_weekly_schedule_from_last_week(date) to service_role;
