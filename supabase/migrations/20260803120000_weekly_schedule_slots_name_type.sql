-- Override weekly_schedule_slots: free-form named slots with a type.
-- Removes class FK and room; adds name + type (class | workshop | online | meeting).

-- 1) Add new columns (nullable for backfill)
alter table weekly_schedule_slots
  add column if not exists name text,
  add column if not exists type text;

-- 2) Backfill from linked class when present
update weekly_schedule_slots as slot
set
  name = coalesce(nullif(trim(classes.name), ''), 'Untitled slot'),
  type = 'class'
from classes
where slot.class_id = classes.id
  and (slot.name is null or slot.type is null);

update weekly_schedule_slots
set
  name = coalesce(nullif(trim(name), ''), 'Untitled slot'),
  type = coalesce(type, 'class')
where name is null
   or type is null
   or trim(name) = '';

-- 3) Drop class / room indexes and FK
drop index if exists idx_weekly_schedule_slots_class_id;
drop index if exists idx_weekly_schedule_slots_room_day;

alter table weekly_schedule_slots
  drop constraint if exists weekly_schedule_slots_class_id_fkey;

alter table weekly_schedule_slots
  drop column if exists class_id,
  drop column if exists room;

-- 4) Enforce new shape
alter table weekly_schedule_slots
  alter column name set not null,
  alter column type set not null;

alter table weekly_schedule_slots
  drop constraint if exists weekly_schedule_slots_type_check;

alter table weekly_schedule_slots
  add constraint weekly_schedule_slots_type_check
  check (type in ('class', 'workshop', 'online', 'meeting'));

create index if not exists idx_weekly_schedule_slots_type
  on weekly_schedule_slots (type);

comment on table weekly_schedule_slots is
  'Recurring weekly schedule slots (name, type, day, time range).';

comment on column weekly_schedule_slots.name is
  'Display name for the schedule slot.';

comment on column weekly_schedule_slots.type is
  'Slot kind: class, workshop, online, or meeting.';
