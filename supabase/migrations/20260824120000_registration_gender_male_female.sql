-- Registration gender is male or female only.

alter table public.student_registration_applications
  drop constraint if exists student_registration_applications_gender_check;

alter table public.student_registration_applications
  add constraint student_registration_applications_gender_check
  check (gender in ('male', 'female'));
