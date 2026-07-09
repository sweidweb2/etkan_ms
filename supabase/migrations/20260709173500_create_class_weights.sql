create table class_weights (
    class_id uuid primary key references classes(id) on delete cascade,
    group_weight numeric(5,2) not null default 25,
    final_exam_weight numeric(5,2) not null default 25,
    tasks_weight numeric(5,2) not null default 25,
    attendee_weight numeric(5,2) not null default 25,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint class_weights_group_weight_range
        check (group_weight >= 0 and group_weight <= 100),
    constraint class_weights_final_exam_weight_range
        check (final_exam_weight >= 0 and final_exam_weight <= 100),
    constraint class_weights_tasks_weight_range
        check (tasks_weight >= 0 and tasks_weight <= 100),
    constraint class_weights_attendee_weight_range
        check (attendee_weight >= 0 and attendee_weight <= 100),
    constraint class_weights_total_100
        check (group_weight + final_exam_weight + tasks_weight + attendee_weight = 100)
);
