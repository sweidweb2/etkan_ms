-- Link mirrored instructor busy slots back to workshop / workshop slot.

alter table public.instructor_schedule_slots
  add column if not exists source_workshop_id uuid null
    references public.workshops (id) on delete cascade,
  add column if not exists source_slot_id uuid null
    references public.instructor_schedule_slots (id) on delete cascade;

comment on column public.instructor_schedule_slots.source_workshop_id is
  'When set, this instructor busy slot was mirrored from a workshop schedule. Cleared/cascaded with the workshop.';

comment on column public.instructor_schedule_slots.source_slot_id is
  'When set, this row mirrors a specific workshop schedule slot (instructor_schedule_slots.id).';

create index if not exists idx_instructor_schedule_slots_source_workshop_id
  on public.instructor_schedule_slots (source_workshop_id)
  where source_workshop_id is not null;

create index if not exists idx_instructor_schedule_slots_source_slot_id
  on public.instructor_schedule_slots (source_slot_id)
  where source_slot_id is not null;
