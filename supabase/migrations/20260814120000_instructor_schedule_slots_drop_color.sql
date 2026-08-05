-- Color is derived on the frontend from slot id; stop persisting it.

alter table public.instructor_schedule_slots
  drop constraint if exists instructor_schedule_slots_color_hex_check;

alter table public.instructor_schedule_slots
  drop column if exists color;
