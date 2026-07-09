-- classes.status: active/inactive -> scheduled/in_progress/done/paused/stopped

alter table classes
  alter column status drop default;

update classes
set status = case
  when status = 'active' then 'in_progress'
  when status = 'inactive' then 'paused'
  when status in ('scheduled', 'in_progress', 'done', 'paused', 'stopped') then status
  else 'scheduled'
end;

alter table classes
  alter column status set default 'scheduled';

alter table classes
  drop constraint if exists classes_status_check;

alter table classes
  add constraint classes_status_check
  check (status in ('scheduled', 'in_progress', 'done', 'paused', 'stopped'));

comment on column classes.status is
  'Class lifecycle status: scheduled, in_progress, done, paused, or stopped.';
