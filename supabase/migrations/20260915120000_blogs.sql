-- Public blogs CMS: table, bounds helpers, indexes, storage buckets.

create extension if not exists pg_trgm;

create or replace function public.blog_categories_within_bounds(categories text[])
returns boolean
language sql
immutable
as $$
  select
    cardinality(categories) <= 8
    and (
      cardinality(categories) = 0
      or not exists (
        select 1
        from unnest(categories) as category(label)
        where
          length(btrim(label)) < 1
          or length(btrim(label)) > 40
      )
    );
$$;

create or replace function public.blog_sources_within_bounds(sources text[])
returns boolean
language sql
immutable
as $$
  select
    cardinality(sources) <= 20
    and (
      cardinality(sources) = 0
      or not exists (
        select 1
        from unnest(sources) as source(item)
        where
          length(btrim(item)) < 1
          or length(btrim(item)) > 500
      )
    );
$$;

create table public.blogs (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  summary text not null,
  body_html text not null default '',
  categories text[] not null default '{}'::text[],
  thumbnail_url text,
  author_name text not null,
  author_avatar_url text,
  status text not null default 'draft',
  is_featured boolean not null default false,
  reading_time_minutes integer not null default 1,
  published_at timestamptz,
  sources text[] not null default '{}'::text[],
  meta_title text,
  meta_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blogs_slug_format_check
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint blogs_title_length_check
    check (char_length(title) between 1 and 200),
  constraint blogs_summary_length_check
    check (char_length(summary) between 1 and 500),
  constraint blogs_body_html_length_check
    check (char_length(body_html) <= 200000),
  constraint blogs_author_name_length_check
    check (char_length(author_name) between 1 and 120),
  constraint blogs_status_check
    check (status in ('draft', 'published')),
  constraint blogs_reading_time_check
    check (reading_time_minutes >= 1 and reading_time_minutes <= 120),
  constraint blogs_categories_bounds_check
    check (public.blog_categories_within_bounds(categories)),
  constraint blogs_sources_bounds_check
    check (public.blog_sources_within_bounds(sources)),
  constraint blogs_meta_title_length_check
    check (
      meta_title is null
      or char_length(meta_title) between 2 and 120
    ),
  constraint blogs_meta_description_length_check
    check (
      meta_description is null
      or char_length(meta_description) between 2 and 300
    )
);

comment on table public.blogs is
  'Public marketing blog posts. English-only content; EN/AR chrome shows the same posts.';

comment on column public.blogs.slug is
  'UNIQUE; URL-safe lowercase.';

comment on column public.blogs.body_html is
  'HTML body; max 200000 characters.';

comment on column public.blogs.categories is
  'Free-text labels; max 8; each 1..40 chars.';

comment on column public.blogs.thumbnail_url is
  'Public Storage URL from the blogs bucket.';

comment on column public.blogs.author_avatar_url is
  'Public Storage URL from the auther bucket.';

comment on column public.blogs.is_featured is
  'At most one true via partial unique index.';

comment on column public.blogs.sources is
  'Optional source citations; max 20; each 1..500 chars.';

create unique index blogs_slug_uidx on public.blogs (slug);

create unique index blogs_one_featured_uidx
  on public.blogs (is_featured)
  where is_featured = true;

create index blogs_status_published_at_idx
  on public.blogs (status, published_at desc);

create index blogs_created_at_idx
  on public.blogs (created_at desc);

create index blogs_categories_gin_idx
  on public.blogs using gin (categories);

create index blogs_title_trgm_idx
  on public.blogs using gin (title gin_trgm_ops);

create index blogs_author_name_trgm_idx
  on public.blogs using gin (author_name gin_trgm_ops);

alter table public.blogs enable row level security;

-- Cover / thumbnail images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blogs',
  'blogs',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  name = excluded.name,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read blogs images" on storage.objects;
create policy "Public read blogs images"
  on storage.objects
  for select
  to public
  using (bucket_id = 'blogs');

drop policy if exists "Authenticated insert blogs images" on storage.objects;
create policy "Authenticated insert blogs images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'blogs');

drop policy if exists "Authenticated update blogs images" on storage.objects;
create policy "Authenticated update blogs images"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'blogs')
  with check (bucket_id = 'blogs');

drop policy if exists "Authenticated delete blogs images" on storage.objects;
create policy "Authenticated delete blogs images"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'blogs');

-- Author avatars (bucket id kept as "auther" per CMS contract)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'auther',
  'auther',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  name = excluded.name,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read auther images" on storage.objects;
create policy "Public read auther images"
  on storage.objects
  for select
  to public
  using (bucket_id = 'auther');

drop policy if exists "Authenticated insert auther images" on storage.objects;
create policy "Authenticated insert auther images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'auther');

drop policy if exists "Authenticated update auther images" on storage.objects;
create policy "Authenticated update auther images"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'auther')
  with check (bucket_id = 'auther');

drop policy if exists "Authenticated delete auther images" on storage.objects;
create policy "Authenticated delete auther images"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'auther');
