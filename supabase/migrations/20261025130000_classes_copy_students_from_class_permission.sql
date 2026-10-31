-- Add classes.copy_students_from_class and grant it to manager.

insert into public.permissions (key, label, feature_group, access)
values (
  'classes.copy_students_from_class',
  'Copy students from another class',
  'classes',
  'write'
)
on conflict (key) do update
set
  label = excluded.label,
  feature_group = excluded.feature_group,
  access = excluded.access;

insert into public.role_permissions (role, permission_key)
values
  ('manager', 'classes.copy_students_from_class')
on conflict (role, permission_key) do nothing;
