-- Weekly recurring instructor schedule slots: day_of_week + informative slot_date.

alter table public.instructor_schedule_slots
  add column day_of_week smallint;

comment on column public.instructor_schedule_slots.day_of_week is
  'Recurring weekday: 0 = Sunday … 6 = Saturday. slot_date is create/anchor only.';

comment on table public.instructor_schedule_slots is
  'Weekly recurring free/busy schedule slots keyed by entity_type + record_id. slot_date is informative (created/anchor).';

-- Backfill weekday from existing slot_date (Postgres DOW: 0 = Sunday).
update public.instructor_schedule_slots
set day_of_week = extract(dow from slot_date)::smallint
where day_of_week is null;

-- Dedupe copy-last-week duplicates: keep oldest per identity.
delete from public.instructor_schedule_slots as slot
using public.instructor_schedule_slots as kept
where slot.id <> kept.id
  and slot.entity_type = kept.entity_type
  and slot.record_id = kept.record_id
  and slot.name = kept.name
  and slot.day_of_week = kept.day_of_week
  and slot.start_time = kept.start_time
  and slot.end_time = kept.end_time
  and (
    slot.created_at > kept.created_at
    or (slot.created_at = kept.created_at and slot.id::text > kept.id::text)
  );

alter table public.instructor_schedule_slots
  alter column day_of_week set not null;

alter table public.instructor_schedule_slots
  add constraint instructor_schedule_slots_day_of_week_check
    check (day_of_week >= 0 and day_of_week <= 6);

alter table public.instructor_schedule_slots
  drop constraint if exists instructor_schedule_slots_entity_record_name_date_time_key;

alter table public.instructor_schedule_slots
  add constraint instructor_schedule_slots_entity_record_name_dow_time_key
    unique (entity_type, record_id, name, day_of_week, start_time, end_time);

drop index if exists idx_instructor_schedule_slots_entity_record_slot_date;

create index idx_instructor_schedule_slots_entity_record_dow
  on public.instructor_schedule_slots (entity_type, record_id, day_of_week);
