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
    id: "start-scheduled-semesters",
    job_name: "start-scheduled-semesters",
    schedule: "0 0 * * *",
    schedule_label: "Daily at 00:00 UTC",
    frequency: CRON_JOB_FREQUENCIES.DAILY,
    status: CRON_JOB_STATUSES.ACTIVE,
    summary:
      "Set scheduled semesters to in progress when their start date is reached, and notify managers.",
    description:
      "Finds semesters that are still scheduled with a start_date on or before today (UTC), sets their status to in_progress, and creates an academic manager notification listing each started semester. Leaves paused, stopped, done, already in-progress, and null start_date rows unchanged.",
    function_name: "public.start_scheduled_semesters()",
    tables: ["semesters", "notifications"],
    migration:
      "supabase/migrations/20260723000000_cron_start_scheduled_semesters.sql",
    verify_hint:
      "Dashboard → Integrations → Cron, or: select * from cron.job_run_details order by start_time desc limit 20;",
    manual_run: "select public.start_scheduled_semesters();",
  },
];

export function getManagerCronJobsCatalog(): ManagerCronJobRow[] {
  return MANAGER_CRON_JOBS.map((job) => ({
    ...job,
    tables: [...job.tables],
  }));
}
