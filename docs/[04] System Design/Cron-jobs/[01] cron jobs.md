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

## auto-create-weekly-class-sessions

- **Schedule:** daily at **00:00 Asia/Beirut** (`0 21,22 * * *` UTC + hour gate)
- **Function:** `public.auto_create_weekly_class_sessions(p_force boolean default false)`
- **What it does:** For each `in_progress` class whose latest session `starts_at` is older than **6.5 days**, creates **at most one** new session:
  - `starts_at` = last session `starts_at` + 7 days
  - `ends_at` = new `starts_at` + 7 days
  - `topic` = `S{nb_order}` (e.g. `S3`)
  - `semester_id` from the class
  - seeds attendees via `ensure_session_attendees_for_members`
  - inserts a manager `academic` notification (inbox only: `suppress_live_toast = true`) linking to the session
- **Skips:** classes with no sessions; classes that already have `student_course_grade` rows (same structure lock as manual create); non-`in_progress` classes.
- **Tables:** `sessions`, `classes`, `attendee`, `student_course_grade`, `notifications`
- **Migrations:**
  - `supabase/migrations/20261003160000_cron_auto_create_weekly_class_sessions.sql`
  - `supabase/migrations/20261003180000_cron_auto_sessions_notify.sql`

### Verify

- Dashboard → Integrations → Cron, or:

```sql
select * from cron.job_run_details order by start_time desc limit 20;
```

### Manual run

```sql
-- true bypasses the Lebanon-midnight hour gate (for testing)
select public.auto_create_weekly_class_sessions(true);
```

## record-monthly-opening-balance

- **Schedule:** **1st of each month** at **00:00 Asia/Beirut** (`0 21,22 * * *` UTC + day/hour gate)
- **Function:** `public.record_monthly_opening_balance(p_force boolean default false)`
- **What it does:** Computes previous calendar month available money (`student_payments` + credit `transactions` − debit `transactions`) and inserts one `transactions` row dated the 1st of the new month:
  - amount `> 0` → credit
  - amount `< 0` → debit (`abs`)
  - amount `= 0` → credit `0`
  - `category = opening_balance`, `recorded_by = System`, `payment_method = other`
  - manager inbox notification (`suppress_live_toast = true`) → `/manager/income-statement`
- **Idempotent:** skips if an `opening_balance` row already exists for that 1st.
- **Tables:** `transactions`, `student_payments`, `notifications`
- **Migration:** `supabase/migrations/20261003190000_cron_record_monthly_opening_balance.sql`

### Verify

```sql
select * from cron.job_run_details order by start_time desc limit 20;
```

### Manual run

```sql
select public.record_monthly_opening_balance(true);
```

## Removed

### start-scheduled-semesters

Semester lifecycle columns (`status`, `start_date`) were removed; semesters are name + code only.

- **Cron + function dropped by:** `supabase/migrations/20260904120000_slim_semesters_name_code.sql`
- **Previously defined in:** `20260723000000_cron_start_scheduled_semesters.sql`

### notify-manager-payment-alerts

Accounting / payment-alert weekly digest and related billing tables were removed with the accounting feature wipe.

- **Cron + function dropped by:** `supabase/migrations/20260717000000_drop_cron_notify_manager_payment_alerts.sql` (and again idempotently in `20260728130000_drop_notify_manager_payment_alerts.sql`)
- **Tables dropped by:** `supabase/migrations/20260728120000_drop_accounting_tables.sql`
- **Previously defined in:** `20260714000000_cron_notify_manager_payment_alerts.sql` (and later replaced in special-case migrations)
