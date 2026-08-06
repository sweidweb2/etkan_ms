-- Public site gallery images (name + direct URL).

create table public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  direct_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gallery_images_direct_url_unique unique (direct_url)
);

comment on table public.gallery_images is
  'Images shown on the public gallery page (display name + direct URL).';

comment on column public.gallery_images.direct_url is
  'Absolute image URL (e.g. Google Drive uc?id= link).';

create index idx_gallery_images_created_at on public.gallery_images (created_at);

alter table public.gallery_images enable row level security;
