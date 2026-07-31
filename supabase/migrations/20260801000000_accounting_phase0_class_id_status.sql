-- Accounting Phase 0:
-- - payment_phases.class_id (+ one opened phase per class)
-- - student_payment_phases status rename + money cache columns
-- - unique financial adjustment per SPP

--------------------------------------------------
-- PAYMENT PHASES: CLASS_ID
--------------------------------------------------

alter table public.payment_phases
  add column class_id uuid references public.classes (id) on delete restrict;

comment on column public.payment_phases.class_id is
  'Class/group this payment phase bills. At most one opened phase per class.';

-- Feature not live yet: drop any rows that cannot be linked to a class.
delete from public.payment_phases
where class_id is null;

alter table public.payment_phases
  alter column class_id set not null;

create index idx_payment_phases_class_id
  on public.payment_phases (class_id);

create unique index payment_phases_one_opened_per_class
  on public.payment_phases (class_id)
  where status = 'opened';

--------------------------------------------------
-- STUDENT PAYMENT PHASES: STATUS + MONEY CACHE
--------------------------------------------------

alter table public.student_payment_phases
  drop constraint if exists student_payment_phases_status_check;

update public.student_payment_phases
set status = 'pending'
where status = 'standing_by';

update public.student_payment_phases
set status = 'paid'
where status = 'completed';

alter table public.student_payment_phases
  alter column status set default 'pending';

alter table public.student_payment_phases
  add constraint student_payment_phases_status_check
    check (status in ('pending', 'partially_paid', 'paid', 'cancelled'));

comment on column public.student_payment_phases.status is
  'Financial lifecycle: pending, partially_paid, paid, or cancelled. Derived except cancel-on-leave.';

alter table public.student_payment_phases
  add column original_amount numeric(10,2) not null default 0,
  add column adjustment_amount numeric(10,2) not null default 0,
  add column final_amount_due numeric(10,2) not null default 0,
  add column total_paid numeric(10,2) not null default 0,
  add column remaining_amount numeric(10,2) not null default 0;

comment on column public.student_payment_phases.original_amount is
  'Cached phase amount at last recalc (live from payment_phases.amount).';

comment on column public.student_payment_phases.adjustment_amount is
  'Cached currency value of the single financial adjustment (0 if none).';

comment on column public.student_payment_phases.final_amount_due is
  'Cached max(0, original - adjustment).';

comment on column public.student_payment_phases.total_paid is
  'Cached sum of student_payments.amount.';

comment on column public.student_payment_phases.remaining_amount is
  'Cached final_due - total_paid (may be negative = credit).';

create index idx_student_payment_phases_phase_status
  on public.student_payment_phases (payment_phase_id, status);

--------------------------------------------------
-- FINANCIAL ADJUSTMENTS: ONE PER SPP
--------------------------------------------------

alter table public.student_financial_adjustments
  add constraint student_financial_adjustments_spp_unique
    unique (student_payment_phase_id);
