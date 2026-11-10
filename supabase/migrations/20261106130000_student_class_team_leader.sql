-- Per-class team leader flag for students, plus "edited by" tracking on
-- attendance and class tasks so staff can see team-leader edits.

alter table public.student_class
  add column if not exists is_team_leader boolean not null default false;

comment on column public.student_class.is_team_leader is
  'When true, the student may manage attendance and class tasks (create, edit, start; no delete) for this class from the student portal.';

alter table public.attendee
  add column if not exists updated_at timestamptz,
  add column if not exists updated_by uuid references public.profiles (id) on delete set null;

comment on column public.attendee.updated_by is
  'Profile that last changed this attendance status (manager, teacher, or team leader). Null when never edited.';

alter table public.class_tasks
  add column if not exists created_by uuid references public.profiles (id) on delete set null,
  add column if not exists updated_by uuid references public.profiles (id) on delete set null;

comment on column public.class_tasks.created_by is
  'Profile that created the task. Null for legacy or imported rows.';

comment on column public.class_tasks.updated_by is
  'Profile that last edited or started the task.';

insert into public.permissions (key, label, feature_group, access)
values
  (
    'classes.set_team_leader',
    'Set or clear a student''s team leader role in a class',
    'classes',
    'write'
  ),
  (
    'team_leader.attendance.update',
    'Team leader: update session attendance in own class',
    'team_leader',
    'write'
  ),
  (
    'team_leader.tasks.create',
    'Team leader: create class tasks in own class',
    'team_leader',
    'write'
  ),
  (
    'team_leader.tasks.update',
    'Team leader: edit class tasks in own class',
    'team_leader',
    'write'
  ),
  (
    'team_leader.tasks.start',
    'Team leader: start class tasks in own class',
    'team_leader',
    'write'
  )
on conflict (key) do update
set
  label = excluded.label,
  feature_group = excluded.feature_group,
  access = excluded.access;

insert into public.role_permissions (role, permission_key)
values
  ('manager', 'classes.set_team_leader'),
  ('teacher', 'classes.set_team_leader'),
  ('student', 'team_leader.attendance.update'),
  ('student', 'team_leader.tasks.create'),
  ('student', 'team_leader.tasks.update'),
  ('student', 'team_leader.tasks.start')
on conflict (role, permission_key) do nothing;
