-- Optional profile photo. The file lives in Storage;
-- profiles.avatar_url stores the public URL. Null means no avatar.

alter table public.profiles
  add column if not exists avatar_url text;

comment on column public.profiles.avatar_url is
  'Public Storage URL from the avatars bucket (512px square WebP). Null when the user has no avatar.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  262144,
  array['image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  name = excluded.name,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read so avatars render with a plain <img>.
-- Writes stay on the service role (admin client).
drop policy if exists "Public read avatars" on storage.objects;
create policy "Public read avatars"
  on storage.objects
  for select
  to public
  using (bucket_id = 'avatars');

insert into public.permissions (key, label, feature_group, access)
values
  (
    'students.update_own_avatar',
    'Upload or remove own profile photo',
    'students',
    'write'
  ),
  (
    'students.update_avatar',
    'Upload or remove a student''s profile photo',
    'students',
    'write'
  )
on conflict (key) do update
set
  label = excluded.label,
  feature_group = excluded.feature_group,
  access = excluded.access;

insert into public.role_permissions (role, permission_key)
values
  ('student', 'students.update_own_avatar'),
  ('manager', 'students.update_avatar')
on conflict (role, permission_key) do nothing;
