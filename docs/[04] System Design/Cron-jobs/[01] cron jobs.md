# Cron jobs

Catalog for the manager UI: `lib/constants/manager-cron-jobs.ts` — update that file and this doc when you add a job.

## mark-overdue-pending-work-missing

- **Schedule:** daily at **00:00 UTC** (`0 0 * * *`)
- **Function:** `public.mark_overdue_pending_work_missing()`
- **What it does:** Finds student task and final-exam grade rows that are still `pending` after the parent due date has passed, and sets their status to `missing`.
- **Tables:**
  - `student_tasks` (via `tasks.due_date`)
  - `student_finalexam_grade` (via `final_exam.due_date`)
- **Leaves unchanged:** `submitted`, `graded`, `late`, and already-`missing` rows; rows with a null due date.
- **Migration:** `supabase/migrations/20260711000000_cron_mark_overdue_pending_missing.sql`

### Verify

- Dashboard → Integrations → Cron, or:

```sql
select * from cron.job_run_details order by start_time desc limit 20;
```

### Manual run

```sql
select public.mark_overdue_pending_work_missing();
```

## start-scheduled-semesters

- **Schedule:** daily at **00:00 UTC** (`0 0 * * *`)
- **Function:** `public.start_scheduled_semesters()`
- **What it does:** Finds semesters that are still `scheduled` with a `start_date` on or before today (UTC), sets their status to `in_progress`, and creates an academic manager notification listing each started semester.
- **Tables:**
  - `semesters`
  - `notifications`
- **Leaves unchanged:** `paused`, `stopped`, `done`, already-`in_progress`, and rows with a null `start_date`.
- **Migration:** `supabase/migrations/20260723000000_cron_start_scheduled_semesters.sql`

### Verify

- Dashboard → Integrations → Cron, or:

```sql
select * from cron.job_run_details order by start_time desc limit 20;
```

### Manual run

```sql
select public.start_scheduled_semesters();
```

## Removed

### notify-manager-payment-alerts

Accounting / payment-alert weekly digest and related billing tables were removed with the accounting feature wipe.

- **Cron + function dropped by:** `supabase/migrations/20260717000000_drop_cron_notify_manager_payment_alerts.sql` (and again idempotently in `20260728130000_drop_notify_manager_payment_alerts.sql`)
- **Tables dropped by:** `supabase/migrations/20260728120000_drop_accounting_tables.sql`
- **Previously defined in:** `20260714000000_cron_notify_manager_payment_alerts.sql` (and later replaced in special-case migrations)
