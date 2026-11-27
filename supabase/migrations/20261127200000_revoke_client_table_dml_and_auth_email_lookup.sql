-- Close PostgREST hole: app data access uses service_role only.
-- Browser clients need SELECT on notifications for Realtime postgres_changes
-- (RLS already restricts rows). Revoke DML from anon/authenticated elsewhere.
-- Also add a targeted auth.users email lookup for admin uniqueness checks.

revoke select, insert, update, delete on all tables in schema public
  from anon, authenticated;

-- Realtime notification payloads require SELECT; RLS policies still apply.
grant select on table public.notifications to authenticated;

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables
  from anon, authenticated;

-- service_role keeps full DML (already granted in 20260927140000).
grant select, insert, update, delete on all tables in schema public
  to service_role;

alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables
  to service_role;

-- Targeted email → auth user id (avoids paginating auth.admin.listUsers).
create or replace function public.find_auth_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = auth, public
as $$
  select id
  from auth.users
  where lower(email) = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.find_auth_user_id_by_email(text) from public;
grant execute on function public.find_auth_user_id_by_email(text) to service_role;

comment on function public.find_auth_user_id_by_email(text) is
  'Service-role lookup of auth.users.id by email; replaces Auth Admin full scans.';

-- Subject kanban: aggregate class counts in SQL (avoid loading every class row).
create or replace function public.count_classes_by_subject()
returns table (subject_id uuid, class_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select c.subject_id, count(*)::bigint as class_count
  from public.classes c
  where c.subject_id is not null
  group by c.subject_id;
$$;

revoke all on function public.count_classes_by_subject() from public;
grant execute on function public.count_classes_by_subject() to service_role;
