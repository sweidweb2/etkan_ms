-- Public Storage bucket for workshop documents.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('workshops', 'workshops', true, null, null)
on conflict (id) do update
set
  public = excluded.public,
  name = excluded.name;

-- Public read
drop policy if exists "Public read workshops documents" on storage.objects;
create policy "Public read workshops documents"
  on storage.objects
  for select
  to public
  using (bucket_id = 'workshops');

-- Authenticated write (Phase 4 may also use service-role admin client)
drop policy if exists "Authenticated insert workshops documents" on storage.objects;
create policy "Authenticated insert workshops documents"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'workshops');

drop policy if exists "Authenticated update workshops documents" on storage.objects;
create policy "Authenticated update workshops documents"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'workshops')
  with check (bucket_id = 'workshops');

drop policy if exists "Authenticated delete workshops documents" on storage.objects;
create policy "Authenticated delete workshops documents"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'workshops');
