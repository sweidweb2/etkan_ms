-- Remap subscribed_semesters.status to pending | paid | paused | stopped | refunded.

update public.subscribed_semesters
set status = 'stopped'
where status = 'cancelled';

update public.subscribed_semesters
set status = 'pending'
where status is null
   or status not in ('pending', 'paid', 'paused', 'stopped', 'refunded');

alter table public.subscribed_semesters
  alter column status set default 'pending',
  alter column status set not null;

alter table public.subscribed_semesters
  drop constraint if exists subscribed_semesters_status_check;

alter table public.subscribed_semesters
  add constraint subscribed_semesters_status_check
  check (status in ('pending', 'paid', 'paused', 'stopped', 'refunded'));

create unique index if not exists subscribed_semesters_account_semester_uidx
  on public.subscribed_semesters (account_id, semester_id)
  where semester_id is not null;

comment on column public.subscribed_semesters.status is
  'Billing lifecycle: pending, paid, paused, stopped, refunded.';
