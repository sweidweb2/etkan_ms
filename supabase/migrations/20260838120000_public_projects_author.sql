-- Add nullable author (maker display name) to public projects.
alter table public.public_projects
  add column author text;

comment on column public.public_projects.author is
  'Project author / maker display name (nullable free text).';
