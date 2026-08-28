alter table public.profiles
  add column is_mentor boolean not null default false;

comment on column public.profiles.is_mentor is
  'When true, the user is a mentor.';
