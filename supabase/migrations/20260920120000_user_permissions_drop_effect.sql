-- UBAC: drop redundant effect column (rows are always allows).

alter table public.user_permissions
  drop constraint if exists user_permissions_effect_check;

alter table public.user_permissions
  drop column if exists effect;

comment on table public.user_permissions is
  'UBAC overlay: per-user allow keys on top of role_permissions. Managed by manager role only.';
