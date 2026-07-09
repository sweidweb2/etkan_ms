-- Class teaching sessions and per-student attendance (attendee) records.

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  nb_order integer not null,
  topic text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
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

create table if not exists attendee (
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

create index if not exists idx_sessions_class_id
on sessions(class_id);

create index if not exists idx_sessions_starts_at
on sessions(starts_at);

create index if not exists idx_attendee_session_id
on attendee(session_id);

create index if not exists idx_attendee_student_id
on attendee(student_id);

create index if not exists idx_attendee_status
on attendee(status);

-- Link existing tasks.session_id to sessions now that the table exists.
alter table tasks
drop constraint if exists tasks_session_id_fkey;

alter table tasks
add constraint tasks_session_id_fkey
foreign key (session_id) references sessions(id) on delete set null;
