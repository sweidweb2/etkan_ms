-- Allow crm as a profiles.role value in role_permissions and as a
-- notification audience.

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
      'trainer',
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
      'trainer',
      'student',
      'all'
    )
  );
