-- Public gallery images bucket (files; gallery_images.direct_url stores the public URL).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gallery',
  'gallery',
  true,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  name = excluded.name,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read gallery images" on storage.objects;
create policy "Public read gallery images"
  on storage.objects
  for select
  to public
  using (bucket_id = 'gallery');

drop policy if exists "Authenticated insert gallery images" on storage.objects;
create policy "Authenticated insert gallery images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'gallery');

drop policy if exists "Authenticated update gallery images" on storage.objects;
create policy "Authenticated update gallery images"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'gallery')
  with check (bucket_id = 'gallery');

drop policy if exists "Authenticated delete gallery images" on storage.objects;
create policy "Authenticated delete gallery images"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'gallery');
