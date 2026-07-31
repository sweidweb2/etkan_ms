-- Accounting override: payment_phases bind to semester_id instead of class_id.
-- Billing membership still follows the semester's in_progress class (app layer).

-- 1) Drop class-scoped uniqueness / index
drop index if exists public.payment_phases_one_opened_per_class;
drop index if exists public.idx_payment_phases_class_id;

-- 2) Add semester_id and backfill from prior class_id → classes.semester_id
alter table public.payment_phases
  add column if not exists semester_id uuid;

comment on column public.payment_phases.semester_id is
  'Owning semester for this payment phase. SPP membership sync uses the semester''s in_progress class.';

update public.payment_phases pp
set semester_id = c.semester_id
from public.classes c
where pp.class_id = c.id
  and pp.semester_id is null
  and c.semester_id is not null;

-- Dev-safe: remove phases that cannot resolve a semester
delete from public.payment_phases
where semester_id is null;

alter table public.payment_phases
  alter column semester_id set not null;

alter table public.payment_phases
  drop constraint if exists payment_phases_semester_id_fkey;

alter table public.payment_phases
  add constraint payment_phases_semester_id_fkey
  foreign key (semester_id) references public.semesters (id) on delete restrict;

-- 3) Drop class_id
alter table public.payment_phases
  drop constraint if exists payment_phases_class_id_fkey;

alter table public.payment_phases
  drop column if exists class_id;

-- 4) Indexes
create index if not exists idx_payment_phases_semester_id
  on public.payment_phases (semester_id);

create unique index if not exists payment_phases_one_opened_per_semester
  on public.payment_phases (semester_id)
  where status = 'opened';

comment on table public.payment_phases is
  'Available payment plans scoped to a semester. semester_code is copied from semesters at create; semester_id is the FK.';
