import {
  CRON_JOB_FREQUENCIES,
  CRON_JOB_STATUSES,
  type ManagerCronJobRow,
} from "@/types/manager-cron-job";

/**
 * Static catalog of scheduled jobs for the manager Cron jobs page.
 * Keep in sync with docs/cron_jobs and supabase/migrations that call cron.schedule.
 */
export const MANAGER_CRON_JOBS: ManagerCronJobRow[] = [
  {
    id: "mark-overdue-pending-work-missing",
    job_name: "mark-overdue-pending-work-missing",
    schedule: "0 0 * * *",
    schedule_label: "Daily at 00:00 UTC",
    frequency: CRON_JOB_FREQUENCIES.DAILY,
    status: CRON_JOB_STATUSES.ACTIVE,
    summary:
      "Mark overdue pending student tasks and final-exam grades as missing.",
    description:
      "Finds student task and final-exam grade rows that are still pending after the parent due date has passed, and sets their status to missing. Leaves submitted, graded, late, and already-missing rows unchanged. Rows with a null due date are skipped.",
    function_name: "public.mark_overdue_pending_work_missing()",
    tables: ["student_tasks", "student_finalexam_grade", "tasks", "final_exam"],
    migration:
      "supabase/migrations/20260711000000_cron_mark_overdue_pending_missing.sql",
    verify_hint:
      "Dashboard → Integrations → Cron, or: select * from cron.job_run_details order by start_time desc limit 20;",
    manual_run: "select public.mark_overdue_pending_work_missing();",
  },
  {
    id: "auto-create-weekly-class-sessions",
    job_name: "auto-create-weekly-class-sessions",
    schedule: "0 21,22 * * *",
    schedule_label: "Daily at 00:00 Asia/Beirut",
    frequency: CRON_JOB_FREQUENCIES.DAILY,
    status: CRON_JOB_STATUSES.ACTIVE,
    summary:
      "Create the next weekly session for in-progress classes that are overdue.",
    description:
      "At Lebanon midnight, finds in-progress classes whose latest session starts_at is more than 6.5 days ago, then creates at most one new session per class: starts_at = last starts_at + 7 days, ends_at = starts_at + 7 days, topic S{nb_order}, same semester_id, and seeds attendee rows for current members. Skips classes with no sessions and classes that already have computed course grades (same lock as manual session create). Scheduled at 21:00 and 22:00 UTC with an Asia/Beirut hour gate so DST offsets still hit local midnight once.",
    function_name: "public.auto_create_weekly_class_sessions()",
    tables: ["sessions", "classes", "attendee", "student_course_grade"],
    migration:
      "supabase/migrations/20261003160000_cron_auto_create_weekly_class_sessions.sql",
    verify_hint:
      "Dashboard → Integrations → Cron, or: select * from cron.job_run_details order by start_time desc limit 20;",
    manual_run: "select public.auto_create_weekly_class_sessions(true);",
  },
];

export function getManagerCronJobsCatalog(): ManagerCronJobRow[] {
  return MANAGER_CRON_JOBS.map((job) => ({
    ...job,
    tables: [...job.tables],
  }));
}
