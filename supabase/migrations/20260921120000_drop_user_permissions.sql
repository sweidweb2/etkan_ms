-- Remove UBAC: per-user permission overlays. Access is role_permissions only.

drop table if exists public.user_permissions cascade;
