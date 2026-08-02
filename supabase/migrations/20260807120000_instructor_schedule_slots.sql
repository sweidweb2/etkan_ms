-- Polymorphic free/busy schedule slots (entity_type + record_id).

create table public.instructor_schedule_slots (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  record_id uuid not null,
  name text not null,
  type text not null,
  slot_date date not null,
  start_time time not null,
  end_time time not null,
  color text not null default '#BAE6FD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint instructor_schedule_slots_entity_type_check
    check (entity_type in ('instructor')),
  constraint instructor_schedule_slots_type_check
    check (type in ('free', 'busy')),
  constraint instructor_schedule_slots_end_after_start
    check (end_time > start_time),
  constraint instructor_schedule_slots_color_hex_check
    check (color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint instructor_schedule_slots_entity_record_name_date_time_key
    unique (entity_type, record_id, name, slot_date, start_time, end_time)
);

comment on table public.instructor_schedule_slots is
  'Date-specific free/busy schedule slots keyed by entity_type + record_id (polymorphic).';

comment on column public.instructor_schedule_slots.entity_type is
  'Entity kind for record_id (e.g. instructor). Extensible via check constraint.';

comment on column public.instructor_schedule_slots.record_id is
  'Target entity id interpreted by entity_type (no FK; for instructor = profiles.id).';

comment on column public.instructor_schedule_slots.type is
  'Slot availability: free or busy.';

comment on column public.instructor_schedule_slots.color is
  'Calendar event color as #RRGGBB hex.';

create index idx_instructor_schedule_slots_entity_record_slot_date
  on public.instructor_schedule_slots (entity_type, record_id, slot_date);

create index idx_instructor_schedule_slots_slot_date
  on public.instructor_schedule_slots (slot_date);

create index idx_instructor_schedule_slots_type
  on public.instructor_schedule_slots (type);
