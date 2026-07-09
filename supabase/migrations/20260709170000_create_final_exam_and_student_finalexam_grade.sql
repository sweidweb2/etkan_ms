-- Class-level final exam and per-student grade rows (mirrors tasks / student_tasks).

create table if not exists final_exam (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  title text not null,
  description text,
  due_date timestamptz,
  max_grade numeric(5,2),
  created_at timestamptz not null default now(),
  constraint final_exam_class_unique unique (class_id)
);

comment on table final_exam is
  'One final exam per class (class_id, no session_id).';

create table if not exists student_finalexam_grade (
  id uuid primary key default gen_random_uuid(),
  final_exam_id uuid not null references final_exam(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'submitted', 'graded', 'late', 'missing')),
  submitted_at timestamptz,
  grade numeric(5,2),
  notes text,
  graded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint student_finalexam_grade_exam_student_unique
    unique (final_exam_id, student_id)
);

comment on table student_finalexam_grade is
  'Student final exam grade row (mirrors student_tasks for final_exam).';

create index if not exists idx_final_exam_class_id
on final_exam(class_id);

create index if not exists idx_student_finalexam_grade_final_exam_id
on student_finalexam_grade(final_exam_id);

create index if not exists idx_student_finalexam_grade_student_id
on student_finalexam_grade(student_id);
