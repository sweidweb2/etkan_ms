-- Add contact phone and offering type to workshops.
alter table public.workshops
  add column phone text,
  add column type text not null default 'workshop';

alter table public.workshops
  add constraint workshops_type_check
  check (type in ('course', 'online', 'workshop'));

comment on column public.workshops.phone is
  'Contact phone for the workshop offering.';

comment on column public.workshops.type is
  'Offering type: course | online | workshop.';
