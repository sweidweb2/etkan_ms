-- Auto-created sessions: log a manager inbox notification (no live toast).

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
  v_topic text;
  v_session_id uuid;
  v_created integer := 0;
begin
  if not p_force
     and extract(hour from (now() at time zone 'Asia/Beirut')) <> 0 then
    return 0;
  end if;

  for r in
    select
      c.id as class_id,
      c.name as class_name,
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
      and not exists (
        select 1
        from public.student_course_grade scg
        where scg.class_id = c.id
      )
  loop
    v_starts_at := r.last_starts_at + interval '7 days';
    v_ends_at := v_starts_at + interval '7 days';
    v_nb_order := r.max_nb_order + 1;
    v_topic := 'S' || v_nb_order::text;

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
        v_topic,
        v_starts_at,
        v_ends_at
      )
      returning id into v_session_id;

      perform public.ensure_session_attendees_for_members(
        v_session_id,
        r.class_id
      );

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
        'Session '
          || v_topic
          || ' was created for class '
          || r.class_name
          || '.',
        '/manager/classes/'
          || r.class_id::text
          || '/sessions/'
          || v_session_id::text,
        null,
        true
      );

      v_created := v_created + 1;
    exception
      when unique_violation then
        null;
    end;
  end loop;

  return v_created;
end;
$$;

comment on function public.auto_create_weekly_class_sessions(boolean) is
  'Lebanon midnight: for in_progress classes whose latest session starts_at is older than 6.5 days, create one session (starts_at = last+7d, ends_at = starts_at+7d, topic S{n}, seed attendees) and insert a manager inbox notification with suppress_live_toast. Pass true to bypass the midnight gate for manual runs.';
