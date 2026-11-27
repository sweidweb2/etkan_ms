-- Batch auth.users email lookup by id (service_role only).
-- Replaces cold-path N× Auth Admin getUserById for roster/list hydration.

create or replace function public.list_auth_emails_by_ids(p_ids uuid[])
returns table (id uuid, email text)
language sql
stable
security definer
set search_path = auth, public
as $$
  select u.id, coalesce(u.email, '')::text
  from auth.users u
  where u.id = any (p_ids);
$$;

comment on function public.list_auth_emails_by_ids(uuid[]) is
  'Service-role batch lookup of auth.users emails by id; avoids Auth Admin fan-out.';

revoke all on function public.list_auth_emails_by_ids(uuid[]) from public;
revoke all on function public.list_auth_emails_by_ids(uuid[]) from anon, authenticated;
grant execute on function public.list_auth_emails_by_ids(uuid[]) to service_role;
