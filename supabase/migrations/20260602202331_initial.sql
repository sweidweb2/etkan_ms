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
-- RELATIONSHIPS
--------------------------------------------------

create table relationships (
    id uuid primary key default gen_random_uuid(),
    student_id uuid not null references student_profiles(id) on delete cascade,
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
-- SUBSCRIBED PHASES
--------------------------------------------------

create table subscribed_phases (
    id uuid primary key default gen_random_uuid(),
    account_id uuid not null references accounts(id) on delete cascade,
    phase_id uuid,
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
    created_at timestamp default now()
);



--------------------------------------------------
-- CLASS
--------------------------------------------------

create table classes (
    id uuid primary key default gen_random_uuid(),
    subject_id uuid references subjects(id),
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
-- TASKS
--------------------------------------------------

create table tasks (
    id uuid primary key default gen_random_uuid(),
    session_id uuid,
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
-- INDEXES
--------------------------------------------------

create index idx_student_profiles_user
on student_profiles(user_id);

create index idx_relationship_student
on relationships(student_id);

create index idx_student_class_user
on student_class(user_id);

create index idx_student_class_class
on student_class(class_id);

create index idx_payments_subscription
on payments(subscribed_phase_id);

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



--------------------------------------------------
-- ROW LEVEL SECURITY (profiles)
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