-- Phase 5–7: enroll insert, batch late-join seeds, membership transfer/delete.
-- Unique (user_id, class_id) already exists on student_class.

--------------------------------------------------
-- Phase 5: single enroll insert
--------------------------------------------------

create or replace function public.enroll_student_in_class(
  p_user_id uuid,
  p_class_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.student_class;
begin
  insert into public.student_class (user_id, class_id)
  values (p_user_id, p_class_id)
  on conflict (user_id, class_id) do nothing
  returning * into v_row;

  if v_row.id is null then
    return jsonb_build_object('ok', false, 'code', 'already_enrolled');
  end if;

  return jsonb_build_object('ok', true, 'enrollment', to_jsonb(v_row));
end;
$$;

comment on function public.enroll_student_in_class(uuid, uuid) is
  'Insert student_class. ON CONFLICT (user_id, class_id) → already_enrolled.';

--------------------------------------------------
-- Phase 6: batch enroll
--------------------------------------------------

create or replace function public.enroll_students_in_class(
  p_class_id uuid,
  p_user_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted jsonb := '[]'::jsonb;
  v_already jsonb := '[]'::jsonb;
begin
  if p_user_ids is null or cardinality(p_user_ids) = 0 then
    return jsonb_build_object(
      'inserted', v_inserted,
      'already_enrolled', v_already
    );
  end if;

  with wanted as (
    select distinct unnest(p_user_ids) as user_id
  ),
  inserted as (
    insert into public.student_class (user_id, class_id)
    select wanted.user_id, p_class_id
    from wanted
    on conflict (user_id, class_id) do nothing
    returning *
  )
  select
    coalesce(
      (select jsonb_agg(row_to_json(inserted)::jsonb) from inserted),
      '[]'::jsonb
    ),
    coalesce(
      (
        select jsonb_agg(wanted.user_id)
        from wanted
        where not exists (
          select 1 from inserted where inserted.user_id = wanted.user_id
        )
      ),
      '[]'::jsonb
    )
  into v_inserted, v_already;

  return jsonb_build_object(
    'inserted', v_inserted,
    'already_enrolled', v_already
  );
end;
$$;

comment on function public.enroll_students_in_class(uuid, uuid[]) is
  'Batch student_class insert. Returns inserted rows and already-enrolled user ids.';

--------------------------------------------------
-- Phase 6: batch late-join seeds
--------------------------------------------------

create or replace function public.seed_late_join_attendees_for_students(
  p_class_id uuid,
  p_student_ids uuid[]
)
returns integer
language sql
security definer
set search_path = public
as $$
  with inserted as (
    insert into public.attendee (session_id, student_id, status, note)
    select
      s.id,
      student_id,
      'absent',
      'he entered late to this class'
    from unnest(coalesce(p_student_ids, array[]::uuid[])) as student_id
    cross join public.sessions s
    where s.class_id = p_class_id
    on conflict (session_id, student_id) do nothing
    returning id
  )
  select count(*)::integer from inserted;
$$;

create or replace function public.seed_late_join_student_tasks_for_students(
  p_class_id uuid,
  p_student_ids uuid[]
)
returns integer
language sql
security definer
set search_path = public
as $$
  with inserted as (
    insert into public.student_tasks (
      task_id,
      student_id,
      status,
      grade,
      notes
    )
    select
      t.id,
      student_id,
      case
        when t.due_date is not null and t.due_date < now() then 'missing'
        else 'pending'
      end,
      case
        when t.due_date is not null and t.due_date < now() then 0
        else null
      end,
      case
        when t.due_date is not null and t.due_date < now() then 'he entered late to this class'
        else null
      end
    from unnest(coalesce(p_student_ids, array[]::uuid[])) as student_id
    cross join public.sessions s
    join public.tasks t on t.session_id = s.id
    where s.class_id = p_class_id
    on conflict (task_id, student_id) do nothing
    returning id
  )
  select count(*)::integer from inserted;
$$;

create or replace function public.ensure_enrollment_final_exam_grades(
  p_class_id uuid,
  p_student_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_row public.student_finalexam_grade;
  v_grades jsonb := '[]'::jsonb;
begin
  if p_student_ids is null or cardinality(p_student_ids) = 0 then
    return v_grades;
  end if;

  foreach v_id in array p_student_ids loop
    v_row := public.ensure_enrollment_final_exam_grade(p_class_id, v_id);
    if v_row is not null then
      v_grades := v_grades || jsonb_build_array(to_jsonb(v_row));
    end if;
  end loop;

  return v_grades;
end;
$$;

create or replace function public.sync_students_joined_class(
  p_class_id uuid,
  p_student_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_result jsonb;
  v_items jsonb := '[]'::jsonb;
begin
  if p_student_ids is null or cardinality(p_student_ids) = 0 then
    return v_items;
  end if;

  foreach v_id in array p_student_ids loop
    begin
      v_result := public.sync_student_joined_class(v_id, p_class_id);
      v_items := v_items || jsonb_build_array(
        jsonb_build_object('studentId', v_id, 'ok', true) || coalesce(v_result, '{}'::jsonb)
      );
    exception
      when others then
        v_items := v_items || jsonb_build_array(
          jsonb_build_object(
            'studentId', v_id,
            'ok', false,
            'error', SQLERRM
          )
        );
    end;
  end loop;

  return v_items;
end;
$$;

--------------------------------------------------
-- Phase 7: remove + transfer membership
--------------------------------------------------

create or replace function public.delete_student_class_membership(
  p_id uuid,
  p_class_id uuid
)
returns public.student_class
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.student_class;
begin
  delete from public.student_class
  where id = p_id
    and class_id = p_class_id
  returning * into v_row;

  if not found then
    return null;
  end if;

  return v_row;
end;
$$;

create or replace function public.transfer_student_between_classes(
  p_user_id uuid,
  p_from_class_id uuid,
  p_to_class_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from public.student_class;
  v_to public.student_class;
begin
  if p_from_class_id = p_to_class_id then
    return jsonb_build_object('ok', false, 'code', 'same_class');
  end if;

  select * into v_from
  from public.student_class
  where user_id = p_user_id
    and class_id = p_from_class_id;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_in_source');
  end if;

  if exists (
    select 1
    from public.student_class
    where user_id = p_user_id
      and class_id = p_to_class_id
  ) then
    return jsonb_build_object('ok', false, 'code', 'already_in_dest');
  end if;

  delete from public.student_class
  where id = v_from.id;

  insert into public.student_class (user_id, class_id)
  values (p_user_id, p_to_class_id)
  returning * into v_to;

  return jsonb_build_object(
    'ok', true,
    'from', to_jsonb(v_from),
    'to', to_jsonb(v_to)
  );
end;
$$;

comment on function public.transfer_student_between_classes(uuid, uuid, uuid) is
  'One transaction: leave source class and enroll in destination. No payment sync.';

revoke all on function public.enroll_student_in_class(uuid, uuid) from public;
revoke all on function public.enroll_students_in_class(uuid, uuid[]) from public;
revoke all on function public.seed_late_join_attendees_for_students(uuid, uuid[]) from public;
revoke all on function public.seed_late_join_student_tasks_for_students(uuid, uuid[]) from public;
revoke all on function public.ensure_enrollment_final_exam_grades(uuid, uuid[]) from public;
revoke all on function public.sync_students_joined_class(uuid, uuid[]) from public;
revoke all on function public.delete_student_class_membership(uuid, uuid) from public;
revoke all on function public.transfer_student_between_classes(uuid, uuid, uuid) from public;

grant execute on function public.enroll_student_in_class(uuid, uuid) to service_role;
grant execute on function public.enroll_students_in_class(uuid, uuid[]) to service_role;
grant execute on function public.seed_late_join_attendees_for_students(uuid, uuid[]) to service_role;
grant execute on function public.seed_late_join_student_tasks_for_students(uuid, uuid[]) to service_role;
grant execute on function public.ensure_enrollment_final_exam_grades(uuid, uuid[]) to service_role;
grant execute on function public.sync_students_joined_class(uuid, uuid[]) to service_role;
grant execute on function public.delete_student_class_membership(uuid, uuid) to service_role;
grant execute on function public.transfer_student_between_classes(uuid, uuid, uuid) to service_role;
