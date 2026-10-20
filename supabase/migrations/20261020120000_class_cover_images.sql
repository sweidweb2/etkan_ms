-- Optional public cover image for a class. The file lives in Storage;
-- classes.image_url stores the public URL. Null means no cover.

alter table public.classes
  add column if not exists image_url text;

comment on column public.classes.image_url is
  'Public Storage URL from the class-covers bucket. Null when the class has no cover.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'class-covers',
  'class-covers',
  true,
  524288,
  array['image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  name = excluded.name,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read so class cards render without a session.
-- Writes stay on the service role (admin client).
drop policy if exists "Public read class covers" on storage.objects;
create policy "Public read class covers"
  on storage.objects
  for select
  to public
  using (bucket_id = 'class-covers');
