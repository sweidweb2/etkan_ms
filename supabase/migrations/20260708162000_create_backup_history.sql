-- Track manager/admin backup exports for the backup page history panel.

create extension if not exists "pgcrypto";

create table if not exists backup_history (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references profiles(id) on delete set null,
  created_by_label text not null,
  scope text not null check (scope in ('table', 'all')),
  table_name text,
  file_name text not null,
  row_count integer not null default 0,
  table_count integer not null default 0,
  created_at timestamp not null default now()
);

create index if not exists idx_backup_history_created_at
on backup_history(created_at desc);
