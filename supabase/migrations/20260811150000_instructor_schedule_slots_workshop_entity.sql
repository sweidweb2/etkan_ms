-- Allow workshop entity_type on polymorphic schedule slots.

alter table public.instructor_schedule_slots
  drop constraint if exists instructor_schedule_slots_entity_type_check;

alter table public.instructor_schedule_slots
  add constraint instructor_schedule_slots_entity_type_check
    check (entity_type in ('instructor', 'workshop'));

comment on column public.instructor_schedule_slots.entity_type is
  'Entity kind for record_id: instructor | workshop.';

comment on column public.instructor_schedule_slots.record_id is
  'Target entity id by entity_type (instructor = profiles.id, workshop = workshops.id).';

comment on table public.instructor_schedule_slots is
  'Weekly recurring free/busy schedule slots keyed by entity_type + record_id (instructor or workshop). slot_date is informative (created/anchor).';
