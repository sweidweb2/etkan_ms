-- Add backup.export_storage and grant it to manager.

insert into public.permissions (key, label, feature_group, access)
values (
  'backup.export_storage',
  'Export storage images',
  'backup',
  'write'
)
on conflict (key) do update
set
  label = excluded.label,
  feature_group = excluded.feature_group,
  access = excluded.access;

insert into public.role_permissions (role, permission_key)
values ('manager', 'backup.export_storage')
on conflict (role, permission_key) do nothing;
