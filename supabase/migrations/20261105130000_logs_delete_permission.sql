-- Add logs.delete and grant it to manager.

insert into public.permissions (key, label, feature_group, access)
values (
  'logs.delete',
  'Delete audit logs',
  'logs',
  'write'
)
on conflict (key) do update
set
  label = excluded.label,
  feature_group = excluded.feature_group,
  access = excluded.access;

insert into public.role_permissions (role, permission_key)
values ('manager', 'logs.delete')
on conflict (role, permission_key) do nothing;
