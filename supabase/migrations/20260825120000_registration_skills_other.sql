-- Optional free-text skill when the applicant selects "other".

alter table public.student_registration_applications
  add column if not exists skills_other text;
