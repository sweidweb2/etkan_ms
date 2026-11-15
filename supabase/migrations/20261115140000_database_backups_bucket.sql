-- Private bucket for automated weekly SQL database backups (no media).
-- Uploads use the service role only (no public / authenticated policies).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'database-backups',
  'database-backups',
  false,
  209715200,
  array[
    'application/sql',
    'application/octet-stream',
    'text/plain',
    'text/sql'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  name = excluded.name,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
