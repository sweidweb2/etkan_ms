-- Weekly session skips + auto-create fixes.
-- 1) class_session_skips: one row per skipped weekly slot (Beirut local date).
-- 2) create_next_weekly_session_for_class: per-class creation with a lead window,
--    skip awareness, no back-dating, and the subject nb_sessions cap.
-- 3) auto_create_weekly_class_sessions: nightly loop over in_progress classes,
--    plus one-time manager notices for "no sessions" and "plan complete".
-- 4) skip_class_week: atomic skip (insert skip row + optionally delete the
--    pre-created session for that week).
-- 5) sessions.skip permission.

-- 1) Table ---------------------------------------------------------------------

create table if not exists public.class_session_skips (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  skip_date date not null,
  reason text check (reason is null or char_length(reason) <= 300),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint class_session_skips_class_date_unique unique (class_id, skip_date)
);

comment on table public.class_session_skips is
  'Skipped weekly session slots per class. The auto-create cron never creates a session on a skipped date.';
comment on column public.class_session_skips.skip_date is
  'Asia/Beirut local date of the skipped weekly slot.';
comment on column public.class_session_skips.reason is
  'Optional reason entered by the teacher or manager.';

alter table public.class_session_skips enable row level security;

-- 2) Per-class creation ---------------------------------------------------------

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
  select c.id, c.name, c.semester_id, c.status, sub.nb_sessions
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
      semester_id,
      nb_order,
      topic,
      starts_at,
      ends_at
    ) values (
      p_class_id,
      v_class.semester_id,
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

comment on function public.create_next_weekly_session_for_class(uuid, integer) is
  'Create the next weekly session for one in_progress class: first slot (last starts_at + 7d * k) that is not skipped and not in the past, only when it starts within p_lead_days. Respects subject nb_sessions and the computed-grades lock. Returns the new session id or null.';

revoke all on function public.create_next_weekly_session_for_class(uuid, integer) from public;
grant execute on function public.create_next_weekly_session_for_class(uuid, integer) to service_role;

-- 3) Nightly cron function ------------------------------------------------------

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
  v_href text;
  v_created integer := 0;
begin
  -- pg_cron fires at 21:00 and 22:00 UTC; only the Beirut-midnight slot runs.
  if not p_force
     and extract(hour from (now() at time zone 'Asia/Beirut')) <> 0 then
    return 0;
  end if;

  for r in
    select
      c.id as class_id,
      c.name as class_name,
      sub.nb_sessions,
      (
        select count(*)::integer
        from public.sessions s
        where s.class_id = c.id
      ) as session_count
    from public.classes c
    left join public.subjects sub on sub.id = c.subject_id
    where c.status = 'in_progress'
  loop
    v_href := '/manager/classes/' || r.class_id::text;

    if r.session_count = 0 then
      insert into public.notifications (
        recipient_id, audience, category, priority, title, body,
        action_href, created_by, suppress_live_toast
      )
      select
        null, 'manager', 'academic', 'normal',
        'Class needs its first session',
        'Class ' || r.class_name
          || ' is in progress but has no sessions. Create the first session so weekly sessions can continue automatically.',
        v_href, null, true
      where not exists (
        select 1
        from public.notifications n
        where n.audience = 'manager'
          and n.title = 'Class needs its first session'
          and n.action_href = v_href
      );
      continue;
    end if;

    if coalesce(r.nb_sessions, 0) > 0 and r.session_count >= r.nb_sessions then
      insert into public.notifications (
        recipient_id, audience, category, priority, title, body,
        action_href, created_by, suppress_live_toast
      )
      select
        null, 'manager', 'academic', 'normal',
        'Class reached its planned sessions',
        'Class ' || r.class_name || ' has all ' || r.nb_sessions::text
          || ' planned sessions. No more sessions will be created automatically.',
        v_href, null, true
      where not exists (
        select 1
        from public.notifications n
        where n.audience = 'manager'
          and n.title = 'Class reached its planned sessions'
          and n.action_href = v_href
      );
      continue;
    end if;

    if public.create_next_weekly_session_for_class(r.class_id, 2) is not null then
      v_created := v_created + 1;
    end if;
  end loop;

  return v_created;
end;
$$;

comment on function public.auto_create_weekly_class_sessions(boolean) is
  'Lebanon midnight: for each in_progress class, create the next weekly session up to 2 days ahead (skips honored, no back-dating, capped at subject nb_sessions). Notifies managers once per class when it has no sessions or reached its planned sessions. Pass true to bypass the midnight gate for manual runs.';

-- 4) Atomic skip ----------------------------------------------------------------

create or replace function public.skip_class_week(
  p_class_id uuid,
  p_skip_date date,
  p_reason text,
  p_created_by uuid,
  p_session_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_skip_id uuid;
begin
  insert into public.class_session_skips (class_id, skip_date, reason, created_by)
  values (p_class_id, p_skip_date, nullif(btrim(coalesce(p_reason, '')), ''), p_created_by)
  returning id into v_skip_id;

  if p_session_id is not null then
    delete from public.sessions
    where id = p_session_id
      and class_id = p_class_id;

    if not found then
      raise exception 'session_not_found' using errcode = 'P0002';
    end if;
  end if;

  return v_skip_id;
end;
$$;

comment on function public.skip_class_week(uuid, date, text, uuid, uuid) is
  'Insert a class_session_skips row and, when p_session_id is set, delete that session in the same transaction.';

revoke all on function public.skip_class_week(uuid, date, text, uuid, uuid) from public;
grant execute on function public.skip_class_week(uuid, date, text, uuid, uuid) to service_role;

-- 5) Permission -----------------------------------------------------------------

insert into public.permissions (key, label, feature_group, access)
values ('sessions.skip', 'Skip class week', 'sessions', 'write')
on conflict (key) do update
set
  label = excluded.label,
  feature_group = excluded.feature_group,
  access = excluded.access;

insert into public.role_permissions (role, permission_key)
select distinct rp.role, 'sessions.skip'
from public.role_permissions rp
where rp.permission_key = 'sessions.create'
on conflict (role, permission_key) do nothing;
