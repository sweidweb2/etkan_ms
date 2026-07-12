alter table public.semesters
  add column start_date date;

comment on column public.semesters.start_date is
  'Academic start date of the semester (date only).';
