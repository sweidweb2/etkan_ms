-- Auth-user dump RPC, new backup permissions, and extra history scopes.

create or replace function public.export_auth_schema_backup()
returns jsonb
language plpgsql
security definer
set search_path = auth, public
as $$
begin
  return jsonb_build_object(
    'exportedAt', timezone('utc', now()),
    'scope', 'auth',
    'tables', jsonb_build_object(
      'users', (
        select coalesce(jsonb_agg(to_jsonb(u) order by u.id), '[]'::jsonb)
        from auth.users u
      ),
      'identities', (
        select coalesce(jsonb_agg(to_jsonb(i) order by i.id), '[]'::jsonb)
        from auth.identities i
      )
    )
  );
end;
$$;

revoke all on function public.export_auth_schema_backup() from public;
revoke all on function public.export_auth_schema_backup() from anon, authenticated;
grant execute on function public.export_auth_schema_backup() to service_role;

insert into public.permissions (key, label, feature_group, access)
values
  ('backup.export_auth', 'Export auth users', 'backup', 'write'),
  ('backup.export_auth_settings', 'Export dashboard auth settings', 'backup', 'write')
on conflict (key) do update
set
  label = excluded.label,
  feature_group = excluded.feature_group,
  access = excluded.access;

insert into public.role_permissions (role, permission_key)
values
  ('manager', 'backup.export_auth'),
  ('manager', 'backup.export_auth_settings')
on conflict (role, permission_key) do nothing;

alter table public.backup_history
  drop constraint if exists backup_history_scope_check;

alter table public.backup_history
  add constraint backup_history_scope_check
  check (scope in ('table', 'all', 'auth', 'storage', 'auth_settings'));
