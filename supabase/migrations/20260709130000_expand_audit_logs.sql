-- Expand audit_logs for change snapshots and display metadata (existing DBs).

alter table audit_logs
  drop constraint if exists audit_logs_user_id_fkey;

alter table audit_logs
  alter column user_id drop not null;

alter table audit_logs
  add column if not exists user_label text not null default 'System',
  add column if not exists old_data jsonb,
  add column if not exists new_data jsonb,
  add column if not exists metadata jsonb;

alter table audit_logs
  alter column created_at type timestamptz using created_at::timestamptz,
  alter column created_at set not null,
  alter column created_at set default now();

alter table audit_logs
  add constraint audit_logs_user_id_fkey
  foreign key (user_id) references profiles(id) on delete set null;

alter table audit_logs
  drop constraint if exists audit_logs_action_check;

alter table audit_logs
  add constraint audit_logs_action_check
  check (action in ('insert', 'update', 'delete', 'login', 'logout', 'export', 'other'));

create index if not exists idx_audit_logs_created_at
on audit_logs(created_at desc);

create index if not exists idx_audit_logs_action
on audit_logs(action);

create index if not exists idx_audit_logs_table_name
on audit_logs(table_name);
