-- Yes/No tasks: graded Yes (100) or No (0). max_grade is always 100.

alter table public.subject_tasks
  add column is_yes_no boolean not null default false;

alter table public.subject_tasks
  add constraint subject_tasks_yes_no_max_grade_check
  check (is_yes_no = false or max_grade = 100);

comment on column public.subject_tasks.is_yes_no is
  'When true the task is graded Yes (100) or No (0); max_grade must be 100.';

alter table public.class_tasks
  add column is_yes_no boolean not null default false;

alter table public.class_tasks
  add constraint class_tasks_yes_no_max_grade_check
  check (is_yes_no = false or max_grade = 100);

comment on column public.class_tasks.is_yes_no is
  'When true the task is graded Yes (100) or No (0); max_grade must be 100. Locked once any student_task has a grade.';

--------------------------------------------------
-- Guard: student grades on Yes/No tasks must be null, 0, or 100
--------------------------------------------------

create or replace function public.enforce_yes_no_student_task_grade()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.grade is null or new.grade = 0 or new.grade = 100 then
    return new;
  end if;

  if exists (
    select 1
    from public.class_tasks t
    where t.id = new.task_id
      and t.is_yes_no = true
  ) then
    raise exception 'Grade for a Yes/No task must be 0 or 100.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

comment on function public.enforce_yes_no_student_task_grade() is
  'Rejects student_tasks grades other than null, 0, or 100 when the class task is Yes/No.';

drop trigger if exists student_tasks_enforce_yes_no_grade on public.student_tasks;

create trigger student_tasks_enforce_yes_no_grade
  before insert or update of grade on public.student_tasks
  for each row
  execute function public.enforce_yes_no_student_task_grade();
