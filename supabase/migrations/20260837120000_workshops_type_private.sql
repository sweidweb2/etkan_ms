-- Rename workshop offering type `online` to `private`.
alter table public.workshops
  drop constraint if exists workshops_type_check;

update public.workshops
set type = 'private'
where type = 'online';

alter table public.workshops
  add constraint workshops_type_check
  check (type in ('course', 'private', 'workshop'));

comment on column public.workshops.type is
  'Offering type: course | private | workshop.';
