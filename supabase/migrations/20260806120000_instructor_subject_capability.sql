-- Instructor flag on profiles + subject capability matrix.

alter table public.profiles
  add column is_instructor boolean not null default false;

comment on column public.profiles.is_instructor is
  'When true, the user appears on Manage instructors and may have subject capabilities.';

create table public.instructor_subject_capability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint instructor_subject_capability_user_subject_unique unique (user_id, subject_id)
);

comment on table public.instructor_subject_capability is
  'Subjects an instructor is capable of teaching (eligibility, not class assignment).';

create index idx_instructor_subject_capability_user_id
  on public.instructor_subject_capability (user_id);

create index idx_instructor_subject_capability_subject_id
  on public.instructor_subject_capability (subject_id);
