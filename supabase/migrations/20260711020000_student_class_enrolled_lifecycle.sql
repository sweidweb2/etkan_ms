-- student_class.status -> enrolled / paused / stopped

alter table student_class
  alter column status drop default;

alter table student_class
  drop constraint if exists student_class_status_check;

update student_class
set status = case
  when status in ('in_progress', 'active', 'enrolled') then 'enrolled'
  when status = 'done' then 'stopped'
  when status = 'paused' then 'paused'
  when status = 'stopped' then 'stopped'
  else 'enrolled'
end;

alter table student_class
  alter column status set default 'enrolled';

alter table student_class
  add constraint student_class_status_check
  check (status in ('enrolled', 'paused', 'stopped'));

comment on column student_class.status is
  'Enrollment lifecycle status: enrolled, paused, or stopped.';
