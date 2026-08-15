-- Public site project cards (bilingual copy + image URL).

create table public.public_projects (
  id uuid primary key default gen_random_uuid(),
  section text not null,
  category text not null,
  title_en text not null,
  title_ar text not null,
  body_en text not null,
  body_ar text not null,
  image_alt_en text not null,
  image_alt_ar text not null,
  image_url text not null,
  href text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_projects_section_check
    check (section in ('students', 'teachers', 'etkan')),
  constraint public_projects_category_check
    check (category in ('webApp', 'mobileApps'))
);

comment on table public.public_projects is
  'Project cards shown on the public /projects page.';

comment on column public.public_projects.section is
  'Public page grouping: students, teachers, or etkan.';

comment on column public.public_projects.category is
  'Filter chip: webApp or mobileApps.';

comment on column public.public_projects.image_url is
  'Public Storage URL from the projects bucket.';

comment on column public.public_projects.href is
  'Optional internal path or external URL for the card link.';

create index idx_public_projects_section_sort
  on public.public_projects (section, sort_order, created_at);

alter table public.public_projects enable row level security;

-- Public Storage bucket for project images.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('projects', 'projects', true, null, null)
on conflict (id) do update
set
  public = excluded.public,
  name = excluded.name;

drop policy if exists "Public read projects images" on storage.objects;
create policy "Public read projects images"
  on storage.objects
  for select
  to public
  using (bucket_id = 'projects');

drop policy if exists "Authenticated insert projects images" on storage.objects;
create policy "Authenticated insert projects images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'projects');

drop policy if exists "Authenticated update projects images" on storage.objects;
create policy "Authenticated update projects images"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'projects')
  with check (bucket_id = 'projects');

drop policy if exists "Authenticated delete projects images" on storage.objects;
create policy "Authenticated delete projects images"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'projects');
