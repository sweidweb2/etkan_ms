-- Drop class-level weights table and group/attendance columns from student_course_grade.

drop table if exists public.class_weights;

alter table public.student_course_grade
  drop column if exists total_group_grade,
  drop column if exists group_grade_weight,
  drop column if exists attendee_grade,
  drop column if exists attendee_weight;
