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
      "Create the next weekly session (2 days ahead) for in-progress classes, honoring skipped weeks.",
    description:
      "At Lebanon midnight, for each in-progress class calls create_next_weekly_session_for_class: the next slot is the latest session starts_at + 7 days, moved forward a week at a time while that Beirut date is in class_session_skips or the slot is more than a day in the past (no back-dating). The session is created only when the slot starts within 2 days, so teachers see it and can skip it beforehand. At most one session per class per run: ends_at = starts_at + 7 days, topic S{nb_order}, same semester_id, attendee rows seeded, and a manager academic notification (inbox only). Stops once the class has the subject's nb_sessions. Classes with no sessions get a one-time manager notice to create the first session; classes that reached their planned sessions get a one-time completion notice. Classes with computed course grades are skipped (same lock as manual session create). Scheduled at 21:00 and 22:00 UTC with an Asia/Beirut hour gate so DST offsets still hit local midnight once.",
    function_name: "public.auto_create_weekly_class_sessions()",
    tables: [
      "sessions",
      "classes",
      "subjects",
      "class_session_skips",
      "attendee",
      "student_course_grade",
      "notifications",
    ],
    migration:
      "supabase/migrations/20261105180000_class_session_skips.sql",
    verify_hint:
      "Dashboard → Integrations → Cron, or: select * from cron.job_run_details order by start_time desc limit 20;",
    manual_run: "select public.auto_create_weekly_class_sessions(true);",
  },
  {
    id: "record-monthly-opening-balance",
    job_name: "record-monthly-opening-balance",
    schedule: "0 21,22 * * *",
    schedule_label: "1st of month at 00:00 Asia/Beirut",
    frequency: CRON_JOB_FREQUENCIES.DAILY,
    status: CRON_JOB_STATUSES.ACTIVE,
    summary:
      "Record last month’s available money as an opening balance transaction.",
    description:
      "On the 1st at Lebanon midnight, computes previous-month available money (student payments + credit transactions − debit transactions) and inserts one opening_balance transaction dated the 1st of the new month: credit if positive, debit if negative, zero credit if zero. Idempotent per 1st. Inserts a manager billing notification (inbox only, suppress_live_toast). Scheduled at 21:00 and 22:00 UTC with an Asia/Beirut day=1 and hour=0 gate.",
    function_name: "public.record_monthly_opening_balance()",
    tables: ["transactions", "student_payments", "notifications"],
    migration:
      "supabase/migrations/20261003190000_cron_record_monthly_opening_balance.sql",
    verify_hint:
      "Dashboard → Integrations → Cron, or: select * from cron.job_run_details order by start_time desc limit 20;",
    manual_run: "select public.record_monthly_opening_balance(true);",
  },
  {
    id: "purge-expired-spp-clearances",
    job_name: "purge-expired-spp-clearances",
    schedule: "15 0 * * *",
    schedule_label: "Daily at 00:15 UTC",
    frequency: CRON_JOB_FREQUENCIES.DAILY,
    status: CRON_JOB_STATUSES.ACTIVE,
    summary:
      "Hard-delete expired SPP Month paid clearance overlay rows.",
    description:
      "Deletes student_payment_phase_clearances rows where created_at + duration_days has passed. Overlay is theoretical only and does not affect SPP money or status. UI also hides expired rows at read time if cron has not run yet.",
    function_name: "public.purge_expired_spp_clearances()",
    tables: ["student_payment_phase_clearances"],
    migration:
      "supabase/migrations/20261020140000_student_payment_phase_clearances.sql",
    verify_hint:
      "Dashboard → Integrations → Cron, or: select * from cron.job_run_details order by start_time desc limit 20;",
    manual_run: "select public.purge_expired_spp_clearances();",
  },
  {
    id: "weekly-database-sql-backup",
    job_name: "weekly-database-sql-backup",
    schedule: "0 3 * * 0",
    schedule_label: "Weekly Sunday 03:00 UTC",
    frequency: CRON_JOB_FREQUENCIES.WEEKLY,
    status: CRON_JOB_STATUSES.ACTIVE,
    summary:
      "SQL dump of all public tables plus auth.users/identities into Storage (no media).",
    description:
      "pg_cron calls public.run_weekly_database_sql_backup(), which uses pg_net to POST /api/cron/database-backup (Bearer from vault). The app exports every public table as SQL inserts, appends auth.users + auth.identities, and uploads one .sql file to the private database-backups bucket under weekly/YYYY/MM/DD/. No media. Requires vault secrets database_backup_cron_url + database_backup_cron_secret (must match app CRON_SECRET). Also records backup_history.",
    function_name: "public.run_weekly_database_sql_backup()",
    tables: ["*", "auth.users", "auth.identities", "storage.buckets/database-backups"],
    migration:
      "supabase/migrations/20261115143000_cron_weekly_database_sql_backup.sql",
    verify_hint:
      "select * from cron.job where jobname = 'weekly-database-sql-backup'; select * from net._http_response order by created desc limit 5; list Storage bucket database-backups.",
    manual_run:
      "select public.run_weekly_database_sql_backup(); — or npm run backup:database",
  },
  {
    id: "task-attachment-clone-drain",
    job_name: "task-attachment-clone-drain",
    schedule: "*/15 * * * *",
    schedule_label: "Every 15 minutes (HTTP safety net)",
    frequency: CRON_JOB_FREQUENCIES.OTHER,
    status: CRON_JOB_STATUSES.ACTIVE,
    summary:
      "Drain pending class-task attachment clone jobs if request-scoped processing stalled.",
    description:
      "Safety net: POST /api/cron/task-attachment-clone with Bearer CRON_SECRET. Requeues stale running/failed jobs and copies remaining subject-task files onto class tasks. Primary processing runs after class-task clone via scheduleAfterResponse (+ 2s backup kick). pg_cron calls public.run_task_attachment_clone_drain() every 5 minutes. Prefer vault task_attachment_clone_cron_url; else derive from database_backup_cron_url (/api/cron/… or origin + path).",
    function_name: "public.run_task_attachment_clone_drain",
    tables: [
      "task_attachment_clone_jobs",
      "task_attachments",
      "storage.buckets/task-attachments",
    ],
    migration: "20261128060000_cron_clone_url_safer_derive.sql",
    verify_hint:
      "curl -X POST \"$APP_URL/api/cron/task-attachment-clone\" -H \"Authorization: Bearer $CRON_SECRET\"; select status, count(*) from task_attachment_clone_jobs group by status;",
    manual_run:
      "select public.run_task_attachment_clone_drain(); or POST /api/cron/task-attachment-clone with Authorization: Bearer $CRON_SECRET",
  },
];

export function getManagerCronJobsCatalog(): ManagerCronJobRow[] {
  return MANAGER_CRON_JOBS.map((job) => ({
    ...job,
    tables: [...job.tables],
  }));
}
