# Supabase Migration Reset & Squash

How to refresh or squash Supabase migrations without breaking remote history.

## Core rule

**Local migration files and remote migration history are separate.**

Supabase Cloud records every applied migration in `supabase_migrations.schema_migrations` (version = the timestamp prefix in the filename, e.g. `20260602202331`).

| Action | Local files | Remote history |
| --- | --- | --- |
| Delete/rename a migration file | Changes | Unchanged |
| `npx supabase db push` | Reads local | Appends new versions only |
| `npx supabase db reset --linked` | Reads local | Wiped and rebuilt from scratch |

**Never** delete or rename migrations that were already pushed, then run `db push` alone. Remote still remembers the old versions → mismatch errors.

**Always** reset the linked remote when squashing, or only add new migrations on top of existing history.

---

## Two kinds of reset

| Goal | Command | Effect |
| --- | --- | --- |
| Local dev only | `npx supabase db reset` | Wipes local Docker DB, replays `supabase/migrations/` |
| Remote (linked cloud) | `npx supabase db reset --linked` | Wipes remote DB + auth users + migration history, replays local migrations |

Use `--linked` only on **dev/staging** projects where losing all data is acceptable.

---

## Check sync before and after

```bash
npx supabase migration list
```

Healthy state: every row shows the same version under **Local** and **Remote**.

```
   Local          | Remote         | Time (UTC)
  ----------------|----------------|---------------------
   20260602202331 | 20260602202331 | 2026-06-02 20:23:31
```

---

## Normal workflow (additive changes)

When the remote is already in sync and you only need a schema change:

```bash
npx supabase migration new my_change_name
# edit supabase/migrations/<timestamp>_my_change_name.sql
npx supabase db push
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
```

Do **not** delete old migration files in this flow.

---

## Squash all migrations into one file

Use when you want a single clean `initial.sql` (no incremental `phase_id` renames, `drop if exists` hacks, etc.).

### 1. Write the final schema in one migration

Keep only `supabase/migrations/20260602202331_initial.sql` (or one new timestamped file) with the **end state** of the schema:

| Former incremental migration | Final shape in `initial.sql` |
| --- | --- |
| `drop_relationships_student_id` | `relationships` without `student_id` |
| `convert_phases_to_semesters` | `semesters` table; `classes.semester_id`; `subscribed_semesters.semester_id` (not `phase_id`) |
| `create_backup_history` | `backup_history` table |
| `app_settings_maintenance_mode` | `app_settings` + RLS |
| `create_notifications` | `notifications` table |
| `subjects_nb_sessions` | `subjects.nb_sessions` + check constraint |
| `create_sessions_and_attendee` | `sessions`, `attendee`, `tasks.session_id` FK |
| `sessions_semester_and_group_grade` | `sessions.semester_id`, `sessions.group_grade_level` |

Omit incremental-only steps (e.g. `drop table phases`) — those tables never exist on a fresh install.

**Table order matters** for foreign keys. Example dependency order:

1. `profiles` → `student_profiles`
2. `semesters` before `classes`, `subscribed_semesters`, `sessions`
3. `sessions` before `tasks` (FK on `session_id`) and `attendee`

**Alternative:** dump the live schema after a successful reset:

```bash
npx supabase db dump --linked -f supabase/migrations/20260602202331_initial.sql --schema public
```

Verify RLS policies (`profiles`, `student_profiles`, `app_settings`) are included in the dump.

### 2. Delete all other migration files locally

```text
supabase/migrations/
  20260602202331_initial.sql   ← keep only this
```

Remove every other `supabase/migrations/*.sql` file.

**Do this only when you are about to reset the linked remote** (step 3). Do not delete files and run `db push` alone.

### 3. Reset linked remote (required)

```bash
npx supabase db reset --linked
```

This will:

1. Drop all `public` tables
2. Truncate `supabase_migrations.schema_migrations`
3. Truncate `auth.users` and related auth tables
4. Apply the single local migration file

You do **not** need `db push` after a successful `db reset --linked`.

### 4. Verify and restore app data

```bash
npx supabase migration list
npm run seed:admin
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
```

`migration list` should show **one row** with Local = Remote.

---

## Why `db push` fails after deleting local migrations

| Broken flow | Correct squash flow |
| --- | --- |
| Delete local migration files | Delete local migration files (keep one) |
| Create new local migration(s) | One consolidated `initial.sql` |
| `npx supabase db push` | `npx supabase db reset --linked` |
| Remote still has old N versions | Remote history wiped; only 1 version recorded |

`db push` = apply **new** migrations on top of existing history.  
`db reset --linked` = wipe DB and replay **all** local migrations from scratch.

---

## Timestamp: keep or change?

| Choice | Notes |
| --- | --- |
| Keep `20260602202331_initial.sql` | Fine after `db reset --linked` |
| New timestamp e.g. `20260710000000_initial.sql` | Also fine — delete the old file so exactly **one** file remains |

What matters: **one local file + reset remote**. The timestamp name is irrelevant after a full reset.

---

## Teammates and CI

Squashing rewrites migration history in git. Everyone on the branch must:

1. Pull the squashed migrations
2. Run `npx supabase db reset --linked` on their linked dev project

**Do not squash** migrations already applied to **production** with real data unless you have a dedicated migration plan.

---

## Optional: seed warning

`supabase/config.toml` references `supabase/seed.sql`. If that file is missing, `db reset` prints:

```text
WARN: no files matched pattern: supabase/seed.sql
```

The reset still succeeds. Use `npm run seed:admin` for the first admin user, or add `supabase/seed.sql` / disable seed in config.

---

## Quick reference

```bash
# Check local vs remote
npx supabase migration list

# Full remote refresh (dev only)
npx supabase db reset --linked

# Normal new change (no squash)
npx supabase migration new change_name
npx supabase db push

# After any schema change
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
```

See also: [docs/cmds/migrations.md](../cmds/migrations.md) for day-to-day commands, [database_explanation_v1.md](./database_explanation_v1.md) for schema overview.
