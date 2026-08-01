-- Rename classes.change_enrollment → classes.remove_student (catalog + grants).

insert into public.permissions (key, label, feature_group, access)
select
  'classes.remove_student',
  'Remove student from class',
  feature_group,
  access
from public.permissions
where key = 'classes.change_enrollment'
on conflict (key) do update
set
  label = excluded.label,
  feature_group = excluded.feature_group,
  access = excluded.access;

update public.role_permissions
set permission_key = 'classes.remove_student'
where permission_key = 'classes.change_enrollment';

delete from public.permissions
where key = 'classes.change_enrollment';
