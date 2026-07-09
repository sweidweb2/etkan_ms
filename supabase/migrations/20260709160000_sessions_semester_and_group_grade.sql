-- Session semester link (phase) and group grade difficulty level.

alter table sessions
add column if not exists semester_id uuid references semesters(id) on delete set null;

alter table sessions
add column if not exists group_grade_level text
  check (
    group_grade_level is null
    or group_grade_level in ('very_low', 'low', 'medium', 'high', 'very_high')
  );

comment on column sessions.semester_id is
  'Optional semester (phase) this session is linked to.';

comment on column sessions.group_grade_level is
  'Group grade difficulty level for this session (very_low … very_high).';

create index if not exists idx_sessions_semester_id
on sessions(semester_id);

create index if not exists idx_sessions_group_grade_level
on sessions(group_grade_level);
