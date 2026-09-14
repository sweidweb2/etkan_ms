-- UBAC: per-user allow/deny overlays on top of role_permissions.
-- Effective access is computed in app services:
--   (role_permissions ∪ allows) − denies
-- No permission-mirrored RLS (same stance as permissions / role_permissions).

create table public.user_permissions (
  user_id uuid not null
    references public.profiles (id) on delete cascade,
  permission_key text not null
    references public.permissions (key) on delete cascade,
  effect text not null
    check (effect in ('allow', 'deny')),
  granted_by uuid null
    references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, permission_key)
);

comment on table public.user_permissions is
  'UBAC overlay: per-user allow/deny on top of role_permissions. Managed by manager role only.';

comment on column public.user_permissions.effect is
  'allow = grant beyond (or reinforcing) role; deny = revoke even if role grants the key.';

comment on column public.user_permissions.granted_by is
  'Optional actor who last wrote this overlay row (manager).';

create index idx_user_permissions_user_id
  on public.user_permissions (user_id);

create index idx_user_permissions_permission_key
  on public.user_permissions (permission_key);

create index idx_user_permissions_granted_by
  on public.user_permissions (granted_by);
