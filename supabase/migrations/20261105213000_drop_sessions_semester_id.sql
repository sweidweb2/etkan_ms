-- Drop sessions.semester_id: sessions inherit the semester through classes.semester_id.
-- Recreate the weekly auto-create function first so it no longer writes the column.

create or replace function public.create_next_weekly_session_for_class(
  p_class_id uuid,
  p_lead_days integer default 2
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class record;
  v_session_count integer;
  v_max_nb_order integer;
  v_last_starts_at timestamptz;
  v_candidate timestamptz;
  v_iterations integer := 0;
  v_nb_order integer;
  v_topic text;
  v_session_id uuid;
begin
  select c.id, c.name, c.status, sub.nb_sessions
  into v_class
  from public.classes c
  left join public.subjects sub on sub.id = c.subject_id
  where c.id = p_class_id;

  if not found or v_class.status <> 'in_progress' then
    return null;
  end if;

  -- Same lock as manual session create.
  if exists (
    select 1 from public.student_course_grade scg where scg.class_id = p_class_id
  ) then
    return null;
  end if;

  select count(*)::integer, max(s.nb_order), max(s.starts_at)
  into v_session_count, v_max_nb_order, v_last_starts_at
  from public.sessions s
  where s.class_id = p_class_id;

  -- First session stays manual (classes have no start date / weekday).
  if v_session_count = 0 then
    return null;
  end if;

  if coalesce(v_class.nb_sessions, 0) > 0
     and v_session_count >= v_class.nb_sessions then
    return null;
  end if;

  -- Next weekly slot that is not skipped and not already in the past
  -- (one day of grace so a same-day slot is still created).
  v_candidate := v_last_starts_at + interval '7 days';
  loop
    exit when not (
      v_candidate < now() - interval '1 day'
      or exists (
        select 1
        from public.class_session_skips k
        where k.class_id = p_class_id
          and k.skip_date = (v_candidate at time zone 'Asia/Beirut')::date
      )
    );

    v_iterations := v_iterations + 1;
    if v_iterations > 60 then
      return null;
    end if;

    v_candidate := v_candidate + interval '7 days';
  end loop;

  if v_candidate > now() + make_interval(days => greatest(coalesce(p_lead_days, 0), 0)) then
    return null;
  end if;

  v_nb_order := coalesce(v_max_nb_order, 0) + 1;
  v_topic := 'S' || v_nb_order::text;

  begin
    insert into public.sessions (
      class_id,
      nb_order,
      topic,
      starts_at,
      ends_at
    ) values (
      p_class_id,
      v_nb_order,
      v_topic,
      v_candidate,
      v_candidate + interval '7 days'
    )
    returning id into v_session_id;
  exception
    when unique_violation then
      -- Concurrent / duplicate run.
      return null;
  end;

  perform public.ensure_session_attendees_for_members(v_session_id, p_class_id);

  insert into public.notifications (
    recipient_id,
    audience,
    category,
    priority,
    title,
    body,
    action_href,
    created_by,
    suppress_live_toast
  ) values (
    null,
    'manager',
    'academic',
    'normal',
    'Session created',
    'Session ' || v_topic || ' was created for class ' || v_class.name || '.',
    '/manager/classes/' || p_class_id::text || '/sessions/' || v_session_id::text,
    null,
    true
  );

  return v_session_id;
end;
$$;

drop index if exists public.idx_sessions_semester_id;

alter table public.sessions
  drop column if exists semester_id;
