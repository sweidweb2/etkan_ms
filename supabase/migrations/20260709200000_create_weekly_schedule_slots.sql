-- weekly_schedule_slots: recurring weekly class timetable entries

create table weekly_schedule_slots (
    id uuid primary key default gen_random_uuid(),
    class_id uuid not null references classes(id) on delete cascade,
    day_of_week text not null
        check (day_of_week in (
            'Sunday', 'Monday', 'Tuesday', 'Wednesday',
            'Thursday', 'Friday', 'Saturday'
        )),
    start_time time not null,
    end_time time not null,
    room text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint weekly_schedule_slots_end_after_start check (end_time > start_time)
);

comment on table weekly_schedule_slots is
    'Recurring weekly class schedule slots (day, time range, room).';

comment on column weekly_schedule_slots.day_of_week is
    'Weekday name matching app calendar (Sunday–Saturday).';

create index idx_weekly_schedule_slots_day
on weekly_schedule_slots(day_of_week);

create index idx_weekly_schedule_slots_class_id
on weekly_schedule_slots(class_id);

create index idx_weekly_schedule_slots_room_day
on weekly_schedule_slots(room, day_of_week);
