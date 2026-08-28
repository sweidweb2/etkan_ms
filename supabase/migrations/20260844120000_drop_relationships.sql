-- Remove the manage-relationships feature.

drop table if exists public.relationships cascade;

delete from public.role_permissions where permission_key like 'relationships.%';
delete from public.permissions where key like 'relationships.%';
