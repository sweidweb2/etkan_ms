-- Optional account owner for a registration dossier (guest handoff / later student view).

alter table public.student_registration_applications
  add column user_id uuid
    references public.profiles (id) on delete set null;

create index idx_student_registration_applications_user_id
  on public.student_registration_applications (user_id);

create unique index idx_student_registration_applications_user_id_active
  on public.student_registration_applications (user_id)
  where user_id is not null and status <> 'cancelled';

comment on column public.student_registration_applications.user_id is
  'Optional link to the account that owns this dossier; at most one non-cancelled application per user.';
