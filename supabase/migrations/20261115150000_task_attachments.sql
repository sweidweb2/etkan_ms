-- Task-definition attachments (subject_tasks / class_tasks) + background clone jobs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'task-attachments',
  'task-attachments',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  name = excluded.name,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  entity text not null
    constraint task_attachments_entity_check
      check (entity in ('subject_task', 'class_task')),
  entity_id uuid not null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size integer not null
    constraint task_attachments_file_size_positive check (file_size > 0),
  uploaded_by uuid
    references public.profiles (id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint task_attachments_storage_path_unique unique (storage_path)
);

comment on table public.task_attachments is
  'Files attached to a subject_task or class_task definition (private task-attachments bucket). Max 10 per entity enforced in app. Class copies are deep-copied from subject on clone.';

comment on column public.task_attachments.storage_path is
  'Logical path including bucket prefix: task-attachments/{entity}/{entity_id}/{uuid}-{safeName}.';

comment on column public.task_attachments.entity is
  'Owning entity kind: subject_task (curriculum template) or class_task (live class copy).';

create index if not exists idx_task_attachments_entity_entity_id
  on public.task_attachments (entity, entity_id);

alter table public.task_attachments enable row level security;

create table if not exists public.task_attachment_clone_jobs (
  id uuid primary key default gen_random_uuid(),
  class_task_id uuid not null
    references public.class_tasks (id) on delete cascade,
  source_subject_task_id uuid
    references public.subject_tasks (id) on delete set null,
  status text not null default 'pending'
    constraint task_attachment_clone_jobs_status_check
      check (status in ('pending', 'running', 'completed', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

comment on table public.task_attachment_clone_jobs is
  'Background jobs that deep-copy subject_task attachments onto a newly cloned class_task.';

create index if not exists idx_task_attachment_clone_jobs_class_task_id
  on public.task_attachment_clone_jobs (class_task_id);

create index if not exists idx_task_attachment_clone_jobs_status
  on public.task_attachment_clone_jobs (status)
  where status in ('pending', 'running');

create unique index if not exists idx_task_attachment_clone_jobs_one_open_per_class_task
  on public.task_attachment_clone_jobs (class_task_id)
  where status in ('pending', 'running');

alter table public.task_attachment_clone_jobs enable row level security;
