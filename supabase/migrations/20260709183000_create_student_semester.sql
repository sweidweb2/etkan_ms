-- student_semester: links students to semesters for accounting / enrollment tracking

create table student_semester (
    id uuid primary key default gen_random_uuid(),
    student_profile_id uuid not null references student_profiles(id) on delete cascade,
    semester_id uuid not null references semesters(id) on delete cascade,
    status text not null default 'pending'
        check (status in ('pending', 'active', 'inactive', 'withdrawn')),
    created_at timestamptz not null default now(),
    constraint student_semester_student_semester_unique
        unique (student_profile_id, semester_id)
);

comment on table student_semester is
    'Student enrollment in a semester for accounting and access tracking.';

comment on column student_semester.status is
    'Enrollment lifecycle: pending, active, inactive, or withdrawn.';

create index idx_student_semester_semester_id
on student_semester(semester_id);

create index idx_student_semester_student_profile_id
on student_semester(student_profile_id);

create index idx_student_semester_status
on student_semester(status);
