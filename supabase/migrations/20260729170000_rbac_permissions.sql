-- RBAC catalog and role ↔ permission grants.
-- Seed rows via `npm run seed:rbac` (from lib/constants/permissions.ts).

create table public.permissions (
  key text primary key,
  label text not null,
  feature_group text not null,
  access text not null
    check (access in ('read', 'write')),
  created_at timestamptz not null default now()
);

comment on table public.permissions is
  'RBAC permission catalog. Keys match lib/constants/permissions.ts.';

comment on column public.permissions.key is
  'Stable permission key, e.g. subjects.view.';

comment on column public.permissions.feature_group is
  'Feature group for UI grouping, e.g. subjects, grades.';

comment on column public.permissions.access is
  'read = view/preview; write = mutate/export/send.';

create index idx_permissions_feature_group
  on public.permissions (feature_group);

create table public.role_permissions (
  role text not null
    check (
      role in (
        'admin',
        'manager',
        'co-manager',
        'ceo',
        'teacher',
        'trainer',
        'student'
      )
    ),
  permission_key text not null
    references public.permissions (key) on delete cascade,
  primary key (role, permission_key)
);

comment on table public.role_permissions is
  'Which permission keys each profiles.role value may use.';

comment on column public.role_permissions.role is
  'Matches profiles.role (single role per user).';

create index idx_role_permissions_permission_key
  on public.role_permissions (permission_key);
