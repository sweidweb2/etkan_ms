-- Allow minimal guest intake with only full_name required.
alter table public.guests
  alter column phone drop not null,
  alter column age drop not null,
  alter column education_level drop not null,
  alter column interested_service drop not null;

comment on column public.guests.phone is
  'Optional at create; filled in during follow-up when known.';

comment on column public.guests.age is
  'Optional at create; must be > 0 when set.';

comment on column public.guests.education_level is
  'Optional at create: school | uni_year_1 | uni_year_2 | uni_year_3 | uni_year_4_plus | uni_graduate | other.';

comment on column public.guests.interested_service is
  'Optional at create: etkan_roadmap | private | workshops.';
