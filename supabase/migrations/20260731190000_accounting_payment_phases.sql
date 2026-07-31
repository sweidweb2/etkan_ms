-- Accounting feature foundation:
-- 1) semesters.semester_code (unique 4-digit, backfilled)
-- 2) payment_phases / student_payment_phases / student_payments /
--    student_financial_adjustments / student_financial_forms

--------------------------------------------------
-- SEMESTERS.SEMESTER_CODE
--------------------------------------------------

alter table public.semesters
  add column semester_code text;

comment on column public.semesters.semester_code is
  'Unique 4-digit public code for soft-linking payment plans (copied into payment_phases.semester_code; not a FK).';

do $$
declare
  r record;
  candidate text;
begin
  for r in
    select id
    from public.semesters
    where semester_code is null
    order by created_at nulls last, id
  loop
    loop
      candidate := lpad((floor(random() * 10000))::int::text, 4, '0');
      exit when not exists (
        select 1
        from public.semesters
        where semester_code = candidate
      );
    end loop;

    update public.semesters
    set semester_code = candidate
    where id = r.id;
  end loop;
end $$;

alter table public.semesters
  alter column semester_code set not null;

alter table public.semesters
  add constraint semesters_semester_code_format
    check (semester_code ~ '^[0-9]{4}$');

alter table public.semesters
  add constraint semesters_semester_code_unique unique (semester_code);

--------------------------------------------------
-- PAYMENT PHASES
--------------------------------------------------

create table public.payment_phases (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  semester_code text not null,
  amount numeric(10,2) not null,
  upfront_amount numeric(10,2) not null default 0,
  duration_months integer not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'opened'
    check (status in ('opened', 'closed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_phases_amount_non_negative check (amount >= 0),
  constraint payment_phases_upfront_non_negative check (upfront_amount >= 0),
  constraint payment_phases_duration_positive check (duration_months >= 1),
  constraint payment_phases_end_after_start check (end_date >= start_date),
  constraint payment_phases_semester_code_format check (semester_code ~ '^[0-9]{4}$')
);

comment on table public.payment_phases is
  'Available payment plans. semester_code is a copied semester identifier (not a FK).';

comment on column public.payment_phases.semester_code is
  'Copied from semesters.semester_code at plan creation time; not enforced as a foreign key.';

comment on column public.payment_phases.upfront_amount is
  'Initial amount due when the plan is assigned.';

comment on column public.payment_phases.duration_months is
  'Planned payment duration in months.';

comment on column public.payment_phases.status is
  'Plan lifecycle: opened, closed, or cancelled.';

create index idx_payment_phases_semester_code
  on public.payment_phases (semester_code);

create index idx_payment_phases_start_date
  on public.payment_phases (start_date);

create index idx_payment_phases_status
  on public.payment_phases (status);

--------------------------------------------------
-- STUDENT PAYMENT PHASES
--------------------------------------------------

create table public.student_payment_phases (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  payment_phase_id uuid not null references public.payment_phases (id) on delete restrict,
  assigned_at date not null,
  status text not null default 'standing_by'
    check (status in ('standing_by', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_payment_phases_student_phase_unique
    unique (student_id, payment_phase_id)
);

comment on table public.student_payment_phases is
  'Assigns a payment phase plan to a student (profiles.id).';

comment on column public.student_payment_phases.status is
  'Assignment lifecycle: standing_by, completed, or cancelled.';

create index idx_student_payment_phases_student_id
  on public.student_payment_phases (student_id);

create index idx_student_payment_phases_payment_phase_id
  on public.student_payment_phases (payment_phase_id);

create index idx_student_payment_phases_status
  on public.student_payment_phases (status);

--------------------------------------------------
-- STUDENT PAYMENTS
--------------------------------------------------

create table public.student_payments (
  id uuid primary key default gen_random_uuid(),
  student_payment_phase_id uuid not null
    references public.student_payment_phases (id) on delete cascade,
  payment_date date not null,
  amount numeric(10,2) not null,
  payment_method text not null
    check (
      payment_method in (
        'cash',
        'omt',
        'whish',
        'bank_transfer',
        'card',
        'other'
      )
    ),
  received_by text not null,
  received_by_management boolean not null default false,
  receipt_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_payments_amount_non_negative check (amount >= 0)
);

comment on table public.student_payments is
  'Individual payments recorded against a student payment phase assignment.';

comment on column public.student_payments.received_by is
  'Display name of the person who collected the payment.';

comment on column public.student_payments.received_by_management is
  'True when management confirmed receipt.';

create index idx_student_payments_phase_id
  on public.student_payments (student_payment_phase_id);

create index idx_student_payments_payment_date
  on public.student_payments (payment_date);

create index idx_student_payments_payment_method
  on public.student_payments (payment_method);

--------------------------------------------------
-- STUDENT FINANCIAL ADJUSTMENTS
--------------------------------------------------

create table public.student_financial_adjustments (
  id uuid primary key default gen_random_uuid(),
  student_payment_phase_id uuid not null
    references public.student_payment_phases (id) on delete cascade,
  type text not null
    check (type in ('discount', 'scholarship', 'manual_adjustment')),
  value_type text not null
    check (value_type in ('fixed', 'percentage')),
  value numeric(10,2) not null,
  reason text,
  effective_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_financial_adjustments_value_non_negative check (value >= 0),
  constraint student_financial_adjustments_percentage_max
    check (value_type <> 'percentage' or value <= 100)
);

comment on table public.student_financial_adjustments is
  'Discounts, scholarships, and manual adjustments for a student payment phase.';

comment on column public.student_financial_adjustments.value_type is
  'fixed = absolute currency amount; percentage = percent of plan amount.';

create index idx_student_financial_adjustments_phase_id
  on public.student_financial_adjustments (student_payment_phase_id);

create index idx_student_financial_adjustments_type
  on public.student_financial_adjustments (type);

--------------------------------------------------
-- STUDENT FINANCIAL FORMS
--------------------------------------------------

create table public.student_financial_forms (
  id uuid primary key default gen_random_uuid(),
  student_financial_adjustment_id uuid not null
    references public.student_financial_adjustments (id) on delete cascade,
  full_name text not null,
  school_or_university text,
  date_of_birth date,
  phone text,
  parent_phone text,
  current_gpa text,
  received_financial_aid_before boolean not null default false,
  certificates text,
  family_members integer,
  working_family_members integer,
  total_family_income numeric(10,2),
  children_currently_learning integer,
  has_deceased_parent boolean not null default false,
  both_parents_work boolean not null default false,
  family_hardship boolean not null default false,
  family_chronic_disease boolean not null default false,
  affordable_monthly_payment numeric(10,2),
  student_works boolean not null default false,
  student_monthly_income numeric(10,2),
  agreed_to_rules boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_financial_forms_adjustment_unique
    unique (student_financial_adjustment_id),
  constraint student_financial_forms_family_members_non_negative
    check (family_members is null or family_members >= 0),
  constraint student_financial_forms_working_family_non_negative
    check (working_family_members is null or working_family_members >= 0),
  constraint student_financial_forms_children_non_negative
    check (children_currently_learning is null or children_currently_learning >= 0),
  constraint student_financial_forms_income_non_negative
    check (total_family_income is null or total_family_income >= 0),
  constraint student_financial_forms_affordable_non_negative
    check (affordable_monthly_payment is null or affordable_monthly_payment >= 0),
  constraint student_financial_forms_student_income_non_negative
    check (student_monthly_income is null or student_monthly_income >= 0)
);

comment on table public.student_financial_forms is
  'Submitted financial-aid / hardship form linked to a financial adjustment.';

create index idx_student_financial_forms_adjustment_id
  on public.student_financial_forms (student_financial_adjustment_id);
