-- Expand registration application statuses:
-- pending | accepted | applied | missing | rejected
-- Migrate legacy "reviewed" → "pending".

update public.student_registration_applications
set status = 'pending',
    updated_at = now()
where status = 'reviewed';

alter table public.student_registration_applications
  drop constraint if exists student_registration_applications_status_check;

alter table public.student_registration_applications
  add constraint student_registration_applications_status_check
  check (status in ('pending', 'accepted', 'applied', 'missing', 'rejected'));
