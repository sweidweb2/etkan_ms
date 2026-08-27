-- Mentor subjects catalog + instructor capability matrix (replaces instructor_subject_capability).

create table public.mentor_subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null,
  created_at timestamptz not null default now()
);

create unique index mentor_subjects_name_lower_unique
  on public.mentor_subjects (lower(name));

create index idx_mentor_subjects_sort_order
  on public.mentor_subjects (sort_order);

comment on table public.mentor_subjects is
  'Mentor/workshop subject catalog for instructor capabilities (independent of academic subjects).';

create table public.mentor_subject_capability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  mentor_subject_id uuid not null references public.mentor_subjects (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint mentor_subject_capability_user_subject_unique unique (user_id, mentor_subject_id)
);

comment on table public.mentor_subject_capability is
  'Mentor subjects an instructor is capable of teaching (eligibility, not class assignment).';

create index idx_mentor_subject_capability_user_id
  on public.mentor_subject_capability (user_id);

create index idx_mentor_subject_capability_mentor_subject_id
  on public.mentor_subject_capability (mentor_subject_id);

drop table if exists public.instructor_subject_capability;
