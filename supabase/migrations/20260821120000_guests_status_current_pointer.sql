-- Narrow guests.status to current-pointer values only.
-- Pipeline node statuses remain on guest_status_events.

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
  drop constraint if exists guests_status_check;

alter table public.guests
  add constraint guests_status_check
  check (status in (
    'started',
    'pending',
    'finished',
    'rejected',
    'dropped'
  ));

comment on column public.guests.status is
  'Current pointer only: started | pending | finished | rejected | dropped. Pipeline checkpoints live in guest_status_events.';
