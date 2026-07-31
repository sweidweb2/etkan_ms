-- Make weekly_schedule_slots date-specific (one calendar occurrence per row).

-- 1) Add slot_date
alter table weekly_schedule_slots
  add column if not exists slot_date date;

-- 2) Backfill from day_of_week → most recent past/current matching weekday
update weekly_schedule_slots
set slot_date = (
  current_date
  - (
    (
      extract(dow from current_date)::integer
      - case day_of_week
          when 'Sunday' then 0
          when 'Monday' then 1
          when 'Tuesday' then 2
          when 'Wednesday' then 3
          when 'Thursday' then 4
          when 'Friday' then 5
          when 'Saturday' then 6
          else 0
        end
      + 7
    ) % 7
  ) * interval '1 day'
)::date
where slot_date is null;

update weekly_schedule_slots
set slot_date = current_date
where slot_date is null;

-- 3) Enforce NOT NULL
alter table weekly_schedule_slots
  alter column slot_date set not null;

-- 4) Drop day_of_week
alter table weekly_schedule_slots
  drop constraint if exists weekly_schedule_slots_day_of_week_check;

drop index if exists idx_weekly_schedule_slots_day;

alter table weekly_schedule_slots
  drop column if exists day_of_week;

-- 5) Indexes + uniqueness (skip-duplicate rule)
create index if not exists idx_weekly_schedule_slots_slot_date
  on weekly_schedule_slots (slot_date);

alter table weekly_schedule_slots
  drop constraint if exists weekly_schedule_slots_name_date_time_key;

alter table weekly_schedule_slots
  add constraint weekly_schedule_slots_name_date_time_key
  unique (name, slot_date, start_time, end_time);

comment on table weekly_schedule_slots is
  'Date-specific schedule slots (name, type, date, time range).';

comment on column weekly_schedule_slots.slot_date is
  'Calendar date this slot occurs on (one occurrence per row).';
