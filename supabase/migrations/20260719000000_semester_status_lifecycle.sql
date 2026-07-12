-- Semester lifecycle status: scheduled | in_progress | stopped | paused | done

alter table public.semesters
  add column if not exists status text;

update public.semesters
set status = 'scheduled'
where status is null
   or status not in ('scheduled', 'in_progress', 'stopped', 'paused', 'done');

alter table public.semesters
  alter column status set default 'scheduled',
  alter column status set not null;

alter table public.semesters
  drop constraint if exists semesters_status_check;

alter table public.semesters
  add constraint semesters_status_check
  check (status in ('scheduled', 'in_progress', 'stopped', 'paused', 'done'));

comment on column public.semesters.status is
  'Semester lifecycle: scheduled, in_progress, stopped, paused, done.';
