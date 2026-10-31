-- Drop semester permissions; grant to manager.

insert into public.permissions (key, label, feature_group, access)
values
  (
    'classes.drop_semester',
    'Drop semester for class student',
    'classes',
    'write'
  ),
  (
    'accounting.drop_refunds.process',
    'Process drop semester refund',
    'accounting',
    'write'
  )
on conflict (key) do update
set
  label = excluded.label,
  feature_group = excluded.feature_group,
  access = excluded.access;

insert into public.role_permissions (role, permission_key)
values
  ('manager', 'classes.drop_semester'),
  ('manager', 'accounting.drop_refunds.process')
on conflict (role, permission_key) do nothing;
