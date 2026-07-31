-- Add per-slot display color (hex).

alter table weekly_schedule_slots
  add column if not exists color text not null default '#0284c7';

alter table weekly_schedule_slots
  drop constraint if exists weekly_schedule_slots_color_hex_check;

alter table weekly_schedule_slots
  add constraint weekly_schedule_slots_color_hex_check
  check (color ~ '^#[0-9A-Fa-f]{6}$');

comment on column weekly_schedule_slots.color is
  'Calendar event color as #RRGGBB hex.';
