-- Student task written report + private file uploads.

alter table public.student_tasks
  add column if not exists student_report text;

comment on column public.student_tasks.student_report is
  'Optional written student report / submission text for this student task (distinct from staff notes).';

-- Private Storage bucket for student task uploads.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'student-task-uploads',
  'student-task-uploads',
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

create table if not exists public.student_task_uploads (
  id uuid primary key default gen_random_uuid(),
  student_task_id uuid not null
    references public.student_tasks (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size integer not null check (file_size > 0),
  uploaded_by uuid
    references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint student_task_uploads_storage_path_unique unique (storage_path)
);

comment on table public.student_task_uploads is
  'Files uploaded for a student_tasks row (private student-task-uploads bucket). Max 10 per student task enforced in app.';

comment on column public.student_task_uploads.storage_path is
  'Logical path including bucket prefix: student-task-uploads/{student_task_id}/{uuid}-{safeName}.';

create index if not exists idx_student_task_uploads_student_task_id
  on public.student_task_uploads (student_task_id);

alter table public.student_task_uploads enable row level security;
