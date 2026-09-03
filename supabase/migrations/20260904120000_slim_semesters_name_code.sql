-- Slim semesters to id/name/semester_code/created_at.
-- Drop start-scheduled-semesters cron (depends on status + start_date).

do $$
declare
  v_jobid bigint;
begin
  select j.jobid
    into v_jobid
  from cron.job j
  where j.jobname = 'start-scheduled-semesters'
  limit 1;

  if v_jobid is not null then
    perform cron.unschedule(v_jobid);
  end if;
exception
  when undefined_table then
    null;
end $$;

drop function if exists public.start_scheduled_semesters();

alter table public.semesters
  drop constraint if exists semesters_status_check;

alter table public.semesters
  drop column if exists nb_courses,
  drop column if exists amount,
  drop column if exists status,
  drop column if exists start_date;

-- Remove semester UI permissions that no longer exist in the app catalog.
delete from public.role_permissions
where permission_key in ('semesters.add_student', 'semesters.connect_class');

delete from public.permissions
where key in ('semesters.add_student', 'semesters.connect_class');
