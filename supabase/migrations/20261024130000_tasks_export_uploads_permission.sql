-- Add tasks.export_uploads and grant it to class-tree staff roles.

insert into public.permissions (key, label, feature_group, access)
values (
  'tasks.export_uploads',
  'Export student task uploads as ZIP',
  'tasks',
  'read'
)
on conflict (key) do update
set
  label = excluded.label,
  feature_group = excluded.feature_group,
  access = excluded.access;

insert into public.role_permissions (role, permission_key)
values
  ('manager', 'tasks.export_uploads'),
  ('teacher', 'tasks.export_uploads'),
  ('supervisor', 'tasks.export_uploads')
on conflict (role, permission_key) do nothing;
