-- Public project copy is English-only (stored and displayed as-is).

alter table public.public_projects
  drop column if exists title_ar,
  drop column if exists body_ar,
  drop column if exists image_alt_ar;

alter table public.public_projects
  rename column title_en to title;

alter table public.public_projects
  rename column body_en to body;

alter table public.public_projects
  rename column image_alt_en to image_alt;

comment on table public.public_projects is
  'Project cards shown on the public /projects page. Copy is English-only.';

comment on column public.public_projects.title is
  'English title stored and displayed as-is.';

comment on column public.public_projects.body is
  'English body stored and displayed as-is.';

comment on column public.public_projects.image_alt is
  'English image alt text stored and displayed as-is.';
