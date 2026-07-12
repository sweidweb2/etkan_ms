-- Ensure one student_course_grade row per student × class.
-- Keep the newest row when duplicates exist.

delete from public.student_course_grade scg
using public.student_course_grade newer
where scg.user_id = newer.user_id
  and scg.class_id = newer.class_id
  and scg.id <> newer.id
  and (
    coalesce(scg.created_at, '-infinity'::timestamp)
    < coalesce(newer.created_at, '-infinity'::timestamp)
    or (
      coalesce(scg.created_at, '-infinity'::timestamp)
        = coalesce(newer.created_at, '-infinity'::timestamp)
      and scg.id::text < newer.id::text
    )
  );

create unique index if not exists student_course_grade_user_class_unique
  on public.student_course_grade (user_id, class_id);
