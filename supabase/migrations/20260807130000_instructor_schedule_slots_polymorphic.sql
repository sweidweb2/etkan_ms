-- Migrate instructor_schedule_slots from user_id FK to polymorphic record_id + entity_type.
-- Safe when the create migration already used the new shape (no-op path).

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'instructor_schedule_slots'
      and column_name = 'user_id'
  ) then
    alter table public.instructor_schedule_slots
      drop constraint if exists instructor_schedule_slots_user_id_fkey;

    alter table public.instructor_schedule_slots
      drop constraint if exists instructor_schedule_slots_user_name_date_time_key;

    drop index if exists idx_instructor_schedule_slots_user_slot_date;

    alter table public.instructor_schedule_slots
      rename column user_id to record_id;

    alter table public.instructor_schedule_slots
      add column if not exists entity_type text;

    update public.instructor_schedule_slots
    set entity_type = 'instructor'
    where entity_type is null;

    alter table public.instructor_schedule_slots
      alter column entity_type set not null;

    alter table public.instructor_schedule_slots
      drop constraint if exists instructor_schedule_slots_entity_type_check;

    alter table public.instructor_schedule_slots
      add constraint instructor_schedule_slots_entity_type_check
      check (entity_type in ('instructor'));

    alter table public.instructor_schedule_slots
      drop constraint if exists instructor_schedule_slots_entity_record_name_date_time_key;

    alter table public.instructor_schedule_slots
      add constraint instructor_schedule_slots_entity_record_name_date_time_key
      unique (entity_type, record_id, name, slot_date, start_time, end_time);

    create index if not exists idx_instructor_schedule_slots_entity_record_slot_date
      on public.instructor_schedule_slots (entity_type, record_id, slot_date);

    comment on table public.instructor_schedule_slots is
      'Date-specific free/busy schedule slots keyed by entity_type + record_id (polymorphic).';

    comment on column public.instructor_schedule_slots.entity_type is
      'Entity kind for record_id (e.g. instructor). Extensible via check constraint.';

    comment on column public.instructor_schedule_slots.record_id is
      'Target entity id interpreted by entity_type (no FK; for instructor = profiles.id).';
  end if;
end $$;
