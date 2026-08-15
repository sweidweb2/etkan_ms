-- Classification replaces section; category is free text.
-- Sort order and image alt are handled in the app, not stored.

drop index if exists idx_public_projects_section_sort;

alter table public.public_projects
  drop constraint if exists public_projects_section_check;

alter table public.public_projects
  drop constraint if exists public_projects_category_check;

alter table public.public_projects
  drop column if exists sort_order,
  drop column if exists image_alt;

alter table public.public_projects
  rename column section to classification;

alter table public.public_projects
  add constraint public_projects_classification_check
    check (classification in ('students', 'teachers', 'etkan'));

create index idx_public_projects_classification_created
  on public.public_projects (classification, created_at);

comment on column public.public_projects.classification is
  'Project grouping: students, teachers, or etkan.';

comment on column public.public_projects.category is
  'Free-text category, e.g. mobile app.';

comment on column public.public_projects.href is
  'Optional internal path or external URL for the card link.';
