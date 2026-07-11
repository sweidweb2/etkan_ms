-- Per-session group and attendance grade snapshots on student_course_grade.

alter table public.student_course_grade
  add column if not exists group_grades_json jsonb,
  add column if not exists attendee_grades_json jsonb;

comment on column public.student_course_grade.group_grades_json is
  'Per-session group grade entries for this student in the class.';

comment on column public.student_course_grade.attendee_grades_json is
  'Per-session attendance grade entries for this student in the class.';
