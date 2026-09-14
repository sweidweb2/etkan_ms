-- Remove trainer role: reassign users/notifications, drop grants, tighten checks.

update public.profiles
set role = 'teacher'
where role = 'trainer';

update public.notifications
set audience = 'teacher'
where audience = 'trainer';

delete from public.role_permissions
where role = 'trainer';

alter table public.role_permissions
  drop constraint if exists role_permissions_role_check;

alter table public.role_permissions
  add constraint role_permissions_role_check
  check (
    role in (
      'admin',
      'manager',
      'co-manager',
      'ceo',
      'supervisor',
      'crm',
      'teacher',
      'student'
    )
  );

alter table public.notifications
  drop constraint if exists notifications_audience_check;

alter table public.notifications
  add constraint notifications_audience_check
  check (
    audience in (
      'admin',
      'manager',
      'co-manager',
      'ceo',
      'supervisor',
      'crm',
      'teacher',
      'student',
      'all'
    )
  );
