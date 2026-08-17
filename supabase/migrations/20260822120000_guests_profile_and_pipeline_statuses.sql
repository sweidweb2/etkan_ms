-- Split guests.status (profile) from guest_status_events (pipeline log).

update public.guests
set status = 'scheduled',
    updated_at = now()
where status = 'started';

update public.guests
set status = 'cancelled',
    updated_at = now()
where status = 'dropped';

update public.guests
set status = 'pending',
    updated_at = now()
where status in (
  'finished_meeting',
  'finished_parent_meeting',
  'chose_plan',
  'routed_correctly',
  'finishing_routing_doc'
);

alter table public.guests
  alter column status set default 'scheduled';

alter table public.guests
  drop constraint if exists guests_status_check;

alter table public.guests
  add constraint guests_status_check
  check (status in (
    'scheduled',
    'pending',
    'cancelled',
    'rejected',
    'finished'
  ));

comment on column public.guests.status is
  'Profile pointer: scheduled | pending | cancelled | rejected | finished. Pipeline log lives in guest_status_events.';

delete from public.guest_status_events
where status in ('pending', 'rejected', 'dropped');

alter table public.guest_status_events
  drop constraint if exists guest_status_events_status_check;

alter table public.guest_status_events
  add constraint guest_status_events_status_check
  check (status in (
    'started',
    'finished_meeting',
    'finished_parent_meeting',
    'chose_plan',
    'routed_correctly',
    'finishing_routing_doc',
    'finished'
  ));

comment on table public.guest_status_events is
  'Pipeline checkpoint log. CRUD only while guests.status is pending.';
