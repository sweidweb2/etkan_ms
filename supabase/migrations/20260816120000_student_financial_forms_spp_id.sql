-- Re-key student_financial_forms from adjustment → student_payment_phase.

alter table public.student_financial_forms
  add column student_payment_phase_id uuid;

update public.student_financial_forms as f
set student_payment_phase_id = a.student_payment_phase_id
from public.student_financial_adjustments as a
where a.id = f.student_financial_adjustment_id;

delete from public.student_financial_forms
where student_payment_phase_id is null;

alter table public.student_financial_forms
  alter column student_payment_phase_id set not null;

alter table public.student_financial_forms
  add constraint student_financial_forms_student_payment_phase_id_fkey
    foreign key (student_payment_phase_id)
    references public.student_payment_phases (id)
    on delete cascade,
  add constraint student_financial_forms_spp_unique
    unique (student_payment_phase_id);

create index idx_student_financial_forms_spp_id
  on public.student_financial_forms (student_payment_phase_id);

drop index if exists idx_student_financial_forms_adjustment_id;

alter table public.student_financial_forms
  drop constraint student_financial_forms_adjustment_unique,
  drop constraint student_financial_forms_student_financial_adjustment_id_fkey,
  drop column student_financial_adjustment_id;

comment on table public.student_financial_forms is
  'Submitted financial-aid / hardship form linked to a student payment phase.';
