-- Theoretical "Month paid" clearance overlay per student payment phase (SPP).
-- Does not affect financial totals, SPP status, schedules, or analytics.

create extension if not exists pg_cron with schema pg_catalog;

create table public.student_payment_phase_clearances (
  id uuid primary key default gen_random_uuid(),
  student_payment_phase_id uuid not null unique
    references public.student_payment_phases (id) on delete cascade,
  duration_days integer not null
    check (duration_days >= 1 and duration_days <= 365),
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.student_payment_phase_clearances is
  'Theoretical Month paid overlay per SPP. One row max; hard-deleted on expiry or manually. Does not affect money or SPP status.';
comment on column public.student_payment_phase_clearances.student_payment_phase_id is
  'Parent student payment phase (unique — at most one clearance).';
comment on column public.student_payment_phase_clearances.duration_days is
  'Days from created_at until the clearance expires and is purged.';
comment on column public.student_payment_phase_clearances.notes is
  'Optional manager notes.';
comment on column public.student_payment_phase_clearances.created_by is
  'Profile that created the clearance.';
comment on column public.student_payment_phase_clearances.updated_by is
  'Profile that last updated the clearance.';

create index idx_student_payment_phase_clearances_created_at
  on public.student_payment_phase_clearances (created_at);

alter table public.student_payment_phase_clearances enable row level security;

-- Drop clearance when an SPP becomes cancelled --------------------------------

create or replace function public.delete_spp_clearance_on_cancel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cancelled'
     and old.status is distinct from 'cancelled' then
    delete from public.student_payment_phase_clearances
    where student_payment_phase_id = new.id;
  end if;
  return new;
end;
$$;

comment on function public.delete_spp_clearance_on_cancel() is
  'Removes the Month paid clearance overlay when an SPP is marked cancelled.';

create trigger trg_delete_spp_clearance_on_cancel
  after update of status on public.student_payment_phases
  for each row
  execute function public.delete_spp_clearance_on_cancel();

-- Permissions ------------------------------------------------------------

insert into public.permissions (key, label, feature_group, access) values
  ('accounting.clearances.view', 'View SPP month paid clearances', 'accounting', 'read'),
  ('accounting.clearances.create', 'Create SPP month paid clearance', 'accounting', 'write'),
  ('accounting.clearances.update', 'Edit SPP month paid clearance', 'accounting', 'write'),
  ('accounting.clearances.delete', 'Delete SPP month paid clearance', 'accounting', 'write')
on conflict (key) do nothing;

insert into public.role_permissions (role, permission_key)
select r.role, p.key
from (values ('admin'), ('manager'), ('co-manager'), ('ceo')) as r(role)
cross join (
  values
    ('accounting.clearances.view'),
    ('accounting.clearances.create'),
    ('accounting.clearances.update'),
    ('accounting.clearances.delete')
) as p(key)
on conflict do nothing;

insert into public.role_permissions (role, permission_key)
values ('student', 'accounting.clearances.view')
on conflict do nothing;

-- Daily purge of expired clearances --------------------------------------

create or replace function public.purge_expired_spp_clearances()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.student_payment_phase_clearances
  where created_at + (duration_days::text || ' days')::interval <= now();
end;
$$;

comment on function public.purge_expired_spp_clearances() is
  'Hard-deletes SPP Month paid clearance rows whose created_at + duration_days has passed.';

select cron.schedule(
  'purge-expired-spp-clearances',
  '15 0 * * *',
  $$ select public.purge_expired_spp_clearances(); $$
);
