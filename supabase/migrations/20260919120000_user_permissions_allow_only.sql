-- UBAC revision: allow-only overlays (no deny).
-- Effective access: role_permissions ∪ user_allows

delete from public.user_permissions
where effect = 'deny';

alter table public.user_permissions
  drop constraint if exists user_permissions_effect_check;

alter table public.user_permissions
  add constraint user_permissions_effect_check
  check (effect = 'allow');

comment on table public.user_permissions is
  'UBAC overlay: per-user allow grants on top of role_permissions. Managed by manager role only.';

comment on column public.user_permissions.effect is
  'allow = grant beyond (or reinforcing) role. Deny overlays are not supported.';
