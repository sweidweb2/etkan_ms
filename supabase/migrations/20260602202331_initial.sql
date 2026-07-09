-- UUID generation (pgcrypto is available on Supabase; prefer over uuid-ossp)
create extension if not exists "pgcrypto";


--------------------------------------------------
-- USERS PROFILE (linked with Supabase auth.users)
--------------------------------------------------

create table profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    username text unique,
    role text not null default 'student',
    created_at timestamp default now()
);


--------------------------------------------------
-- STUDENT PROFILE
--------------------------------------------------

create table student_profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null unique references profiles(id) on delete cascade,
    full_name text not null,
    birth_date date,
    phone text,
    status text default 'active',
    created_at timestamp default now()
);


--------------------------------------------------
-- RELATIONSHIPS (standalone contact records)
--------------------------------------------------

create table relationships (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    phone text,
    relation_with text,
    major text,
    speciality text,
    is_useful boolean default true,
    created_at timestamp default now()
);


--------------------------------------------------
-- EQUIPMENT
--------------------------------------------------

create table equipments (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    description text,
    quantity integer default 0,
    unit_price numeric(10,2) default 0,
    created_at timestamp default now()
);


--------------------------------------------------
-- STUDENT ACCOUNT
--------------------------------------------------

create table accounts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references profiles(id) on delete cascade,
    opened_at timestamp default now()
);


--------------------------------------------------
-- SEMESTERS
--------------------------------------------------

create table semesters (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    nb_courses integer not null default 0,
    amount numeric(10,2) not null default 0,
    created_at timestamp default now()
);


--------------------------------------------------
-- SUBSCRIBED PHASES
--------------------------------------------------

create table subscribed_phases (
    id uuid primary key default gen_random_uuid(),
    account_id uuid not null references accounts(id) on delete cascade,
    semester_id uuid references semesters(id) on delete set null,
    amount numeric(10,2) not null,
    status text default 'active',
    created_at timestamp default now()
);


--------------------------------------------------
-- PAYMENTS
--------------------------------------------------

create table payments (
    id uuid primary key default gen_random_uuid(),
    subscribed_phase_id uuid not null references subscribed_phases(id) on delete cascade,
    amount numeric(10,2) not null,
    currency text default 'USD',
    method text,
    paid_at timestamp default now()
);


--------------------------------------------------
-- SUBJECT
--------------------------------------------------

create table subjects (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    syllabus_link text,
    reference_link text,
    handout_link text,
    nb_sessions integer not null default 0,
    created_at timestamp default now(),
    constraint subjects_nb_sessions_non_negative check (nb_sessions >= 0)
);

comment on column subjects.nb_sessions is
    'Total planned teaching sessions for this subject curriculum.';


--------------------------------------------------
-- CLASS
--------------------------------------------------

create table classes (
    id uuid primary key default gen_random_uuid(),
    subject_id uuid references subjects(id),
    semester_id uuid references semesters(id) on delete set null,
    name text not null,
    status text default 'active',
    created_at timestamp default now()
);


--------------------------------------------------
-- CLASS TEACHER
--------------------------------------------------

create table class_teacher (
    id uuid primary key default gen_random_uuid(),
    teacher_id uuid not null references profiles(id),
    class_id uuid not null references classes(id) on delete cascade,
    assigned_by uuid references profiles(id),
    assigned_at timestamp default now()
);


--------------------------------------------------
-- STUDENT CLASS
--------------------------------------------------

create table student_class (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references profiles(id) on delete cascade,
    class_id uuid not null references classes(id) on delete cascade,
    status text default 'active',
    joined_at timestamp default now()
);


--------------------------------------------------
-- SESSIONS
--------------------------------------------------

create table sessions (
    id uuid primary key default gen_random_uuid(),
    class_id uuid not null references classes(id) on delete cascade,
    semester_id uuid references semesters(id) on delete set null,
    nb_order integer not null,
    topic text not null,
    starts_at timestamptz not null,
    ends_at timestamptz not null,
    group_grade_level text
        check (
            group_grade_level is null
            or group_grade_level in ('very_low', 'low', 'medium', 'high', 'very_high')
        ),
    created_at timestamptz not null default now(),
    constraint sessions_nb_order_non_negative check (nb_order >= 1),
    constraint sessions_ends_after_starts check (ends_at > starts_at),
    constraint sessions_class_nb_order_unique unique (class_id, nb_order)
);

comment on table sessions is
    'Scheduled teaching sessions for a class (ordered within the class).';

comment on column sessions.nb_order is
    'Session sequence number within the class (1 = first session).';

comment on column sessions.topic is
    'Session title or topic.';

comment on column sessions.semester_id is
    'Optional semester (phase) this session is linked to.';

comment on column sessions.group_grade_level is
    'Group grade difficulty level for this session (very_low … very_high).';


--------------------------------------------------
-- TASKS
--------------------------------------------------

create table tasks (
    id uuid primary key default gen_random_uuid(),
    session_id uuid references sessions(id) on delete set null,
    title text not null,
    description text,
    due_date timestamp,
    max_grade numeric(5,2),
    created_at timestamp default now()
);


--------------------------------------------------
-- STUDENT TASKS
--------------------------------------------------

create table student_tasks (
    id uuid primary key default gen_random_uuid(),
    task_id uuid not null references tasks(id) on delete cascade,
    student_id uuid not null references profiles(id) on delete cascade,
    status text default 'pending',
    submitted_at timestamp,
    grade numeric(5,2),
    notes text,
    graded_at timestamp
);


--------------------------------------------------
-- STUDENT COURSE GRADE
-- Keeps a copy of weights because each student
-- may have custom grading rules
--------------------------------------------------

create table student_course_grade (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null references profiles(id) on delete cascade,
    class_id uuid not null references classes(id) on delete cascade,

    task_json_grade_weights jsonb,

    total_group_grade numeric(5,2),
    group_grade_weight numeric(5,2),

    attendee_grade numeric(5,2),
    attendee_weight numeric(5,2),

    task_weight numeric(5,2),
    task_total_grade numeric(5,2),

    final_exam_grade numeric(5,2),
    final_exam_weight numeric(5,2),

    type text,

    created_at timestamp default now()
);


--------------------------------------------------
-- BORROW EQUIPMENT
--------------------------------------------------

create table borrow_equipment (
    id uuid primary key default gen_random_uuid(),

    equipment_id uuid not null references equipments(id),
    user_id uuid not null references profiles(id),

    quantity integer default 1,

    borrowed_at timestamp default now(),
    returned_at timestamp,

    status text default 'borrowed'
);


--------------------------------------------------
-- STUDENT TAKEOUTS
--------------------------------------------------

create table student_takeouts (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null references profiles(id) on delete cascade,

    factor_id uuid,
    value numeric(10,2),

    created_at timestamp default now()
);


--------------------------------------------------
-- AUDIT LOGS
--------------------------------------------------

create table audit_logs (
    id uuid primary key default gen_random_uuid(),

    user_id uuid references profiles(id) on delete set null,
    user_label text not null default 'System',

    action text not null
        check (action in ('insert', 'update', 'delete', 'login', 'logout', 'export', 'other')),
    table_name text,
    record_id uuid,

    old_data jsonb,
    new_data jsonb,
    metadata jsonb,

    created_at timestamptz not null default now()
);


--------------------------------------------------
-- BACKUP HISTORY
--------------------------------------------------

create table backup_history (
    id uuid primary key default gen_random_uuid(),
    created_by uuid references profiles(id) on delete set null,
    created_by_label text not null,
    scope text not null check (scope in ('table', 'all')),
    table_name text,
    file_name text not null,
    row_count integer not null default 0,
    table_count integer not null default 0,
    created_at timestamp not null default now()
);


--------------------------------------------------
-- APP SETTINGS
--------------------------------------------------

create table app_settings (
    id int primary key default 1,
    maintenance_mode boolean not null default false,
    updated_at timestamp with time zone not null default now()
);

insert into app_settings (id, maintenance_mode)
values (1, false);


--------------------------------------------------
-- NOTIFICATIONS
--------------------------------------------------

create table notifications (
    id uuid primary key default gen_random_uuid(),
    recipient_id uuid references profiles(id) on delete cascade,
    audience text not null default 'manager'
        check (audience in ('admin', 'manager', 'ceo', 'teacher', 'student', 'all')),
    category text not null default 'general'
        check (category in ('system', 'academic', 'billing', 'equipment', 'attendance', 'general')),
    priority text not null default 'normal'
        check (priority in ('low', 'normal', 'high')),
    title text not null,
    body text not null,
    action_href text,
    is_read boolean not null default false,
    read_at timestamptz,
    created_by uuid references profiles(id) on delete set null,
    created_at timestamptz not null default now()
);


--------------------------------------------------
-- ATTENDEE
--------------------------------------------------

create table attendee (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references sessions(id) on delete cascade,
    student_id uuid not null references profiles(id) on delete cascade,
    status text not null default 'present'
        check (status in ('present', 'absent', 'late', 'excused')),
    note text,
    created_at timestamptz not null default now(),
    constraint attendee_session_student_unique unique (session_id, student_id)
);

comment on table attendee is
    'Student attendance for a class session.';

comment on column attendee.student_id is
    'References profiles.id (same student identity as student_class.user_id).';

comment on column attendee.note is
    'Optional manager/teacher note for this attendance record.';


--------------------------------------------------
-- INDEXES
--------------------------------------------------

create index idx_student_profiles_user
on student_profiles(user_id);

create index idx_student_class_user
on student_class(user_id);

create index idx_student_class_class
on student_class(class_id);

create index idx_payments_subscription
on payments(subscribed_phase_id);

create index idx_subscribed_phases_semester_id
on subscribed_phases(semester_id);

create index idx_classes_semester_id
on classes(semester_id);

create index idx_tasks_session
on tasks(session_id);

create index idx_student_tasks_student
on student_tasks(student_id);

create index idx_audit_user
on audit_logs(user_id);

create index idx_audit_logs_created_at
on audit_logs(created_at desc);

create index idx_audit_logs_action
on audit_logs(action);

create index idx_audit_logs_table_name
on audit_logs(table_name);

create index idx_backup_history_created_at
on backup_history(created_at desc);

create index idx_notifications_recipient_id
on notifications(recipient_id);

create index idx_notifications_audience
on notifications(audience);

create index idx_notifications_created_at
on notifications(created_at desc);

create index idx_notifications_unread
on notifications(recipient_id, is_read)
where is_read = false;

create index idx_sessions_class_id
on sessions(class_id);

create index idx_sessions_starts_at
on sessions(starts_at);

create index idx_sessions_semester_id
on sessions(semester_id);

create index idx_sessions_group_grade_level
on sessions(group_grade_level);

create index idx_attendee_session_id
on attendee(session_id);

create index idx_attendee_student_id
on attendee(student_id);

create index idx_attendee_status
on attendee(status);


--------------------------------------------------
-- ROW LEVEL SECURITY
--------------------------------------------------

alter table profiles enable row level security;

create policy "profiles_select_own"
on profiles for select
to authenticated
using (auth.uid() = id);

create policy "profiles_update_own"
on profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

alter table student_profiles enable row level security;

create policy "student_profiles_select_own"
on student_profiles for select
to authenticated
using (auth.uid() = user_id);

create policy "student_profiles_update_own"
on student_profiles for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

alter table app_settings enable row level security;

create policy "app_settings_select_public"
on app_settings
for select
to public
using (true);
