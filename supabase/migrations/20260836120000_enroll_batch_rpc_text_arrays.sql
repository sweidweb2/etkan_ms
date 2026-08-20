-- PostgREST JSON arrays resolve as text[], not uuid[]. The previous
-- enroll_students_in_class(uuid, uuid[]) signature was therefore missing
-- from the schema cache when adding students from the class details page.

drop function if exists public.enroll_students_in_class(uuid, uuid[]);
drop function if exists public.seed_late_join_attendees_for_students(uuid, uuid[]);
drop function if exists public.seed_late_join_student_tasks_for_students(uuid, uuid[]);
drop function if exists public.ensure_enrollment_final_exam_grades(uuid, uuid[]);
drop function if exists public.sync_students_joined_class(uuid, uuid[]);

create or replace function public.enroll_students_in_class(
  p_class_id uuid,
  p_user_ids text[]
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
    select distinct unnest(p_user_ids)::uuid as user_id
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

comment on function public.enroll_students_in_class(uuid, text[]) is
  'Batch student_class insert. Returns inserted rows and already-enrolled user ids.';

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
    insert into public.attendee (session_id, student_id, status, note)
    select
      s.id,
      student_id::uuid,
      'absent',
      'he entered late to this class'
    from unnest(coalesce(p_student_ids, array[]::text[])) as student_id
    cross join public.sessions s
    where s.class_id = p_class_id
    on conflict (session_id, student_id) do nothing
    returning id
  )
  select count(*)::integer from inserted;
$$;

create or replace function public.seed_late_join_student_tasks_for_students(
  p_class_id uuid,
  p_student_ids text[]
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
      student_id::uuid,
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
    from unnest(coalesce(p_student_ids, array[]::text[])) as student_id
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
  p_student_ids text[]
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

  foreach v_id in array p_student_ids::uuid[] loop
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
  p_student_ids text[]
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

  foreach v_id in array p_student_ids::uuid[] loop
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

revoke all on function public.enroll_students_in_class(uuid, text[]) from public;
revoke all on function public.seed_late_join_attendees_for_students(uuid, text[]) from public;
revoke all on function public.seed_late_join_student_tasks_for_students(uuid, text[]) from public;
revoke all on function public.ensure_enrollment_final_exam_grades(uuid, text[]) from public;
revoke all on function public.sync_students_joined_class(uuid, text[]) from public;

grant execute on function public.enroll_students_in_class(uuid, text[]) to service_role;
grant execute on function public.seed_late_join_attendees_for_students(uuid, text[]) to service_role;
grant execute on function public.seed_late_join_student_tasks_for_students(uuid, text[]) to service_role;
grant execute on function public.ensure_enrollment_final_exam_grades(uuid, text[]) to service_role;
grant execute on function public.sync_students_joined_class(uuid, text[]) to service_role;

notify pgrst, 'reload schema';
