-- Phase 8–10: session member attendees, new-task student_tasks seed, leave payment sync.
-- Unique (session_id, student_id) already exists on attendee.
-- Unique (task_id, student_id) already exists on student_tasks.

--------------------------------------------------
-- Phase 8: present attendees for current members
--------------------------------------------------

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
    insert into public.attendee (session_id, student_id, status, note)
    select
      p_session_id,
      sc.user_id,
      'present',
      null
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

--------------------------------------------------
-- Phase 9: seed pending student_tasks for a new task
--------------------------------------------------

create or replace function public.seed_student_tasks_for_new_task(
  p_task_id uuid
)
returns setof public.student_tasks
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.student_tasks (task_id, student_id, status)
  select
    p_task_id,
    sc.user_id,
    'pending'
  from public.tasks t
  join public.sessions s on s.id = t.session_id
  join public.student_class sc on sc.class_id = s.class_id
  where t.id = p_task_id
  on conflict (task_id, student_id) do nothing;

  return query
    select *
    from public.student_tasks
    where task_id = p_task_id;
end;
$$;

comment on function public.seed_student_tasks_for_new_task(uuid) is
  'Insert pending student_tasks for current class members of the task session. ON CONFLICT DO NOTHING.';

--------------------------------------------------
-- Phase 10: leave payment sync
--------------------------------------------------

create or replace function public.sync_student_left_class(
  p_student_id uuid,
  p_class_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_semester_id uuid;
  v_billing_class_id uuid;
  v_phase public.payment_phases;
  v_spp public.student_payment_phases;
  v_empty jsonb := jsonb_build_object(
    'phase', null,
    'spp', null,
    'retained', false
  );
begin
  select semester_id into v_semester_id
  from public.classes
  where id = p_class_id;

  if v_semester_id is null then
    return v_empty;
  end if;

  select id into v_billing_class_id
  from public.classes
  where semester_id = v_semester_id
    and status = 'in_progress'
  order by created_at asc
  limit 1;

  if v_billing_class_id is distinct from p_class_id then
    return v_empty;
  end if;

  select * into v_phase
  from public.payment_phases
  where semester_id = v_semester_id
    and status = 'opened'
  limit 1;

  if not found then
    select * into v_phase
    from public.payment_phases
    where semester_id = v_semester_id
      and status = 'closed'
    order by created_at desc
    limit 1;
  end if;

  if not found or v_phase.status = 'cancelled' then
    return v_empty;
  end if;

  select * into v_spp
  from public.student_payment_phases
  where student_id = p_student_id
    and payment_phase_id = v_phase.id;

  if not found then
    return jsonb_build_object(
      'phase', to_jsonb(v_phase),
      'spp', null,
      'retained', false
    );
  end if;

  if v_spp.status = 'cancelled' then
    return jsonb_build_object(
      'phase', to_jsonb(v_phase),
      'spp', to_jsonb(v_spp),
      'retained', false
    );
  end if;

  perform public.internal_recalc_payment_phase_status_from_spps(v_phase.id);

  select * into v_phase from public.payment_phases where id = v_phase.id;
  select * into v_spp from public.student_payment_phases where id = v_spp.id;

  return jsonb_build_object(
    'phase', to_jsonb(v_phase),
    'spp', to_jsonb(v_spp),
    'retained', true
  );
end;
$$;

comment on function public.sync_student_left_class(uuid, uuid) is
  'One-transaction payment sync when a student leaves a class. Keeps SPP; recalcs phase status.';

revoke all on function public.ensure_session_attendees_for_members(uuid, uuid) from public;
revoke all on function public.seed_student_tasks_for_new_task(uuid) from public;
revoke all on function public.sync_student_left_class(uuid, uuid) from public;

grant execute on function public.ensure_session_attendees_for_members(uuid, uuid) to service_role;
grant execute on function public.seed_student_tasks_for_new_task(uuid) to service_role;
grant execute on function public.sync_student_left_class(uuid, uuid) to service_role;
