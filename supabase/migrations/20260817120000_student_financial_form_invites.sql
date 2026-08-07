-- Allow multiple financial forms per SPP and add one-shot public invites.

alter table public.student_financial_forms
  drop constraint if exists student_financial_forms_spp_unique;

create table public.student_financial_form_invites (
  id uuid primary key default gen_random_uuid(),
  student_payment_phase_id uuid not null
    references public.student_payment_phases (id) on delete cascade,
  token text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  used_at timestamptz,
  form_id uuid,
  constraint student_financial_form_invites_token_unique unique (token)
);

comment on table public.student_financial_form_invites is
  'One-shot public links for submitting a financial form for a student payment phase.';

create index idx_student_financial_form_invites_spp_id
  on public.student_financial_form_invites (student_payment_phase_id);

alter table public.student_financial_forms
  add column invite_id uuid;

alter table public.student_financial_forms
  add constraint student_financial_forms_invite_id_fkey
    foreign key (invite_id)
    references public.student_financial_form_invites (id)
    on delete set null,
  add constraint student_financial_forms_invite_id_unique
    unique (invite_id);

alter table public.student_financial_form_invites
  add constraint student_financial_form_invites_form_id_fkey
    foreign key (form_id)
    references public.student_financial_forms (id)
    on delete set null;
