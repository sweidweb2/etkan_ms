-- Phase A: binary student_class membership (in class / not in class).
-- Removes paused/stopped rows, then drops the status column.

-- A1: Treat paused/stopped as not in class (delete membership rows).
delete from public.student_class
where status in ('paused', 'stopped');

-- A2: Drop status column and its check constraint (constraint is inline on column).
alter table public.student_class
  drop column if exists status;

comment on table public.student_class is
  'Class membership: presence of a row means the student is in the class (no enrollment status).';
