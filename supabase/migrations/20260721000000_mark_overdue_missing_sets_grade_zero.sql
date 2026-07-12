-- Align overdue cron with late-join seeding: missing work stores grade = 0.

create or replace function public.mark_overdue_pending_work_missing()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update student_tasks st
  set status = 'missing',
      grade = 0
  from tasks t
  where st.task_id = t.id
    and st.status = 'pending'
    and t.due_date is not null
    and t.due_date < now();

  update student_finalexam_grade sfg
  set status = 'missing',
      grade = 0
  from final_exam fe
  where sfg.final_exam_id = fe.id
    and sfg.status = 'pending'
    and fe.due_date is not null
    and fe.due_date < now();
end;
$$;

comment on function public.mark_overdue_pending_work_missing() is
  'Sets pending student_tasks and student_finalexam_grade rows to missing with grade 0 when the parent due_date is in the past.';
