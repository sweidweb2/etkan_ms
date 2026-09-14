-- Optional written report for a class session.

alter table public.sessions
  add column if not exists session_report text;

comment on column public.sessions.session_report is
  'Optional written report / notes for this class session.';
