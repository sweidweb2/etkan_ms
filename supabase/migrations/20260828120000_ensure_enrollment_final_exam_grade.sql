-- Enroll: one round-trip to seed the class final-exam grade row.
-- Past-due → missing + grade 0 + late note. Upcoming/null due → pending.
-- Unique (final_exam_id, student_id) already exists; ON CONFLICT keeps the existing row.

create or replace function public.ensure_enrollment_final_exam_grade(
  p_class_id uuid,
  p_student_id uuid
)
returns public.student_finalexam_grade
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exam public.final_exam;
  v_row public.student_finalexam_grade;
  v_status text;
  v_grade numeric(5,2);
  v_notes text;
begin
  select * into v_exam
  from public.final_exam
  where class_id = p_class_id;

  if not found then
    return null;
  end if;

  if v_exam.due_date is not null and v_exam.due_date < now() then
    v_status := 'missing';
    v_grade := 0;
    v_notes := 'he entered late to this class';
  else
    v_status := 'pending';
    v_grade := null;
    v_notes := null;
  end if;

  insert into public.student_finalexam_grade (
    final_exam_id,
    student_id,
    status,
    submitted_at,
    grade,
    notes,
    graded_at
  )
  values (
    v_exam.id,
    p_student_id,
    v_status,
    null,
    v_grade,
    v_notes,
    null
  )
  on conflict (final_exam_id, student_id) do nothing
  returning * into v_row;

  if v_row.id is null then
    select * into v_row
    from public.student_finalexam_grade
    where final_exam_id = v_exam.id
      and student_id = p_student_id;
  end if;

  return v_row;
end;
$$;

comment on function public.ensure_enrollment_final_exam_grade(uuid, uuid) is
  'Idempotent enroll exam grade: past-due missing+0+late note, else pending. ON CONFLICT keeps the existing row.';

revoke all on function public.ensure_enrollment_final_exam_grade(uuid, uuid) from public;
grant execute on function public.ensure_enrollment_final_exam_grade(uuid, uuid) to service_role;
