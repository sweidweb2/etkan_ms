-- Drop unused attendee.note: attendance is status-only in the product UI.
-- Recreate seed RPCs without the column, then drop it.

create or replace function public.seed_late_join_attendees(
  p_class_id uuid,
  p_student_id uuid
)
returns integer
language sql
security definer
set search_path = public
as $$
  with inserted as (
    insert into public.attendee (session_id, student_id, status)
    select
      s.id,
      p_student_id,
      'absent'
    from public.sessions s
    where s.class_id = p_class_id
    on conflict (session_id, student_id) do nothing
    returning id
  )
  select count(*)::integer from inserted;
$$;

comment on function public.seed_late_join_attendees(uuid, uuid) is
  'Idempotent: absent attendee rows for every class session (late join).';

create or replace function public.seed_late_join_attendees_for_students(
  p_class_id uuid,
  p_student_ids text[]
)
returns integer
language sql
security definer
set search_path = public
as $$
  with inserted as (
    insert into public.attendee (session_id, student_id, status)
    select
      s.id,
      student_id::uuid,
      'absent'
    from unnest(coalesce(p_student_ids, array[]::text[])) as student_id
    cross join public.sessions s
    where s.class_id = p_class_id
    on conflict (session_id, student_id) do nothing
    returning id
  )
  select count(*)::integer from inserted;
$$;

comment on function public.seed_late_join_attendees_for_students(uuid, text[]) is
  'Idempotent batch: absent attendee rows for every class session (late join).';

create or replace function public.ensure_session_attendees_for_members(
  p_session_id uuid,
  p_class_id uuid
)
returns integer
language sql
security definer
set search_path = public
as $$
  with inserted as (
    insert into public.attendee (session_id, student_id, status)
    select
      p_session_id,
      sc.user_id,
      'present'
    from public.sessions s
    join public.student_class sc on sc.class_id = s.class_id
    where s.id = p_session_id
      and s.class_id = p_class_id
    on conflict (session_id, student_id) do nothing
    returning id
  )
  select count(*)::integer from inserted;
$$;

comment on function public.ensure_session_attendees_for_members(uuid, uuid) is
  'Insert present attendee rows for current class members. ON CONFLICT DO NOTHING; never deletes historical rows.';

alter table public.attendee drop column if exists note;
