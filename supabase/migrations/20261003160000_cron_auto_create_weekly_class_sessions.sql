-- Daily cron (Lebanon midnight): for each in-progress class whose latest session
-- starts_at is older than 6.5 days, create one new session at last+7d .. last+14d.

create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.auto_create_weekly_class_sessions(
  p_force boolean default false
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_nb_order integer;
  v_session_id uuid;
  v_created integer := 0;
begin
  -- pg_cron runs in UTC; schedule fires at 21:00 and 22:00 UTC so either
  -- Asia/Beirut UTC+3 or UTC+2 midnight is covered. Only one slot matches.
  if not p_force
     and extract(hour from (now() at time zone 'Asia/Beirut')) <> 0 then
    return 0;
  end if;

  for r in
    select
      c.id as class_id,
      c.semester_id,
      last_s.starts_at as last_starts_at,
      coalesce(max_ord.nb_order, 0) as max_nb_order
    from public.classes c
    join lateral (
      select s.starts_at
      from public.sessions s
      where s.class_id = c.id
      order by s.starts_at desc
      limit 1
    ) last_s on true
    left join lateral (
      select s.nb_order
      from public.sessions s
      where s.class_id = c.id
      order by s.nb_order desc
      limit 1
    ) max_ord on true
    where c.status = 'in_progress'
      and last_s.starts_at < now() - interval '6.5 days'
      -- Match manual create: block when computed grades already exist.
      and not exists (
        select 1
        from public.student_course_grade scg
        where scg.class_id = c.id
      )
  loop
    v_starts_at := r.last_starts_at + interval '7 days';
    v_ends_at := v_starts_at + interval '7 days';
    v_nb_order := r.max_nb_order + 1;

    begin
      insert into public.sessions (
        class_id,
        semester_id,
        nb_order,
        topic,
        starts_at,
        ends_at
      ) values (
        r.class_id,
        r.semester_id,
        v_nb_order,
        'S' || v_nb_order::text,
        v_starts_at,
        v_ends_at
      )
      returning id into v_session_id;

      perform public.ensure_session_attendees_for_members(
        v_session_id,
        r.class_id
      );

      v_created := v_created + 1;
    exception
      when unique_violation then
        -- Concurrent / duplicate run: skip this class.
        null;
    end;
  end loop;

  return v_created;
end;
$$;

comment on function public.auto_create_weekly_class_sessions(boolean) is
  'Lebanon midnight: for in_progress classes whose latest session starts_at is older than 6.5 days, create one session (starts_at = last+7d, ends_at = starts_at+7d, topic S{n}, seed attendees). Pass true to bypass the midnight gate for manual runs.';

select cron.schedule(
  'auto-create-weekly-class-sessions',
  '0 21,22 * * *',
  $$ select public.auto_create_weekly_class_sessions(); $$
);
