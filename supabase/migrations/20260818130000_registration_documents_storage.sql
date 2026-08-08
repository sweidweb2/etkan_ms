-- Private Storage bucket for registration identity documents.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'registration',
  'registration',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  name = excluded.name,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Identity document type on applications (default for any existing rows).
alter table public.student_registration_applications
  add column if not exists id_document_type text;

update public.student_registration_applications
set id_document_type = 'national_id'
where id_document_type is null;

alter table public.student_registration_applications
  alter column id_document_type set default 'national_id',
  alter column id_document_type set not null;

alter table public.student_registration_applications
  drop constraint if exists student_registration_applications_id_document_type_check;

alter table public.student_registration_applications
  add constraint student_registration_applications_id_document_type_check
  check (id_document_type in ('national_id', 'passport', 'civil_record'));

comment on column public.student_registration_applications.id_document_type is
  'Type of official ID attached: national_id, passport, or civil_record.';

create table if not exists public.student_registration_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null
    references public.student_registration_applications (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size integer not null check (file_size > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint student_registration_documents_storage_path_unique unique (storage_path)
);

comment on table public.student_registration_documents is
  'Identity document files for public registration applications (private registration bucket).';

create index if not exists idx_student_registration_documents_application_id
  on public.student_registration_documents (application_id);

alter table public.student_registration_documents enable row level security;
