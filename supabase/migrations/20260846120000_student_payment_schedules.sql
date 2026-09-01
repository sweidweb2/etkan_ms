-- Manual informational payment schedules per student payment phase (SPP).

create table public.student_payment_schedules (
  id uuid primary key default gen_random_uuid(),
  student_payment_phase_id uuid not null
    references public.student_payment_phases (id) on delete cascade,
  due_date date not null,
  amount numeric(10, 2) not null check (amount > 0),
  label text not null,
  status text not null default 'planned'
    check (status in ('planned', 'paid', 'waived', 'cancelled')),
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.student_payment_schedules is
  'Informational payment installments for a student payment phase. Does not affect financial totals.';
comment on column public.student_payment_schedules.student_payment_phase_id is
  'Parent student payment phase (SPP).';
comment on column public.student_payment_schedules.due_date is
  'Expected due date for this installment.';
comment on column public.student_payment_schedules.amount is
  'Expected installment amount (informational only).';
comment on column public.student_payment_schedules.label is
  'Short label, e.g. Upfront or Installment 2.';
comment on column public.student_payment_schedules.status is
  'planned | paid | waived | cancelled — manager-set, informational only.';
comment on column public.student_payment_schedules.notes is
  'Optional notes for this installment.';
comment on column public.student_payment_schedules.created_by is
  'Profile that created the schedule row.';

create index idx_student_payment_schedules_spp
  on public.student_payment_schedules (student_payment_phase_id, due_date);

alter table public.student_payment_schedules enable row level security;

-- Permissions ------------------------------------------------------------

insert into public.permissions (key, label, feature_group, access) values
  ('payment_schedules.view', 'View payment schedules', 'payment_schedules', 'read'),
  ('payment_schedules.create', 'Create payment schedule', 'payment_schedules', 'write'),
  ('payment_schedules.update', 'Edit payment schedule', 'payment_schedules', 'write'),
  ('payment_schedules.delete', 'Delete payment schedule', 'payment_schedules', 'write')
on conflict (key) do nothing;

insert into public.role_permissions (role, permission_key)
select r.role, p.key
from (values ('admin'), ('manager'), ('co-manager'), ('ceo')) as r(role)
cross join (
  values
    ('payment_schedules.view'),
    ('payment_schedules.create'),
    ('payment_schedules.update'),
    ('payment_schedules.delete')
) as p(key)
on conflict do nothing;
