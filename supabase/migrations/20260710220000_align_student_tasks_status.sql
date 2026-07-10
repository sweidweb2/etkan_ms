-- Align student_tasks.status with student_finalexam_grade.status

update student_tasks
set status = 'pending'
where status is null
   or status not in ('pending', 'submitted', 'graded', 'late', 'missing');

alter table student_tasks
  alter column status set default 'pending',
  alter column status set not null;

alter table student_tasks
  add constraint student_tasks_status_check
  check (status in ('pending', 'submitted', 'graded', 'late', 'missing'));

comment on column student_tasks.status is
  'Task progress: pending, submitted, graded, late, missing (aligned with student_finalexam_grade.status).';
