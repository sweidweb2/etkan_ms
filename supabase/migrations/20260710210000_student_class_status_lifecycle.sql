-- student_class.status: active -> in_progress/done/paused/stopped (align with app)

alter table student_class
  alter column status drop default;

update student_class
set status = case
  when status = 'active' then 'in_progress'
  when status in ('in_progress', 'done', 'paused', 'stopped') then status
  else 'in_progress'
end;

alter table student_class
  alter column status set default 'in_progress';

alter table student_class
  drop constraint if exists student_class_status_check;

alter table student_class
  add constraint student_class_status_check
  check (status in ('in_progress', 'done', 'paused', 'stopped'));

comment on column student_class.status is
  'Enrollment lifecycle status: in_progress, done, paused, or stopped.';

-- Prevent duplicate enrollments
create unique index if not exists student_class_user_class_unique
  on student_class (user_id, class_id);
