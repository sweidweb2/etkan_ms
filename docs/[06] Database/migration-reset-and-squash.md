# Supabase migration reset & squash

General reference for keeping local migrations and remote history in sync.

## Core rule

Local migration files and remote migration history are **separate**.

- Remote tracks applied versions in `supabase_migrations.schema_migrations` (version = timestamp prefix in each filename).
- **Do not** delete or rename migrations already pushed, then run `db push` alone — remote still has the old versions.
- **Either** reset the linked remote when squashing, **or** only add new migrations on top of existing history.

| Action | Local files | Remote history |
| --- | --- | --- |
| Delete/rename a migration file | Changes | Unchanged |
| `db push` | Reads local | Appends new versions only |
| `db reset --linked` | Reads local | Wiped and rebuilt from scratch |

---

## Reset types

| Goal | Command | Effect |
| --- | --- | --- |
| Local dev only | `npx supabase db reset` | Wipes local Docker DB, replays `supabase/migrations/` |
| Linked remote | `npx supabase db reset --linked` | Wipes remote DB, auth users, and migration history; replays local migrations |

Use `--linked` only on **dev/staging** where losing all data is acceptable.

---

## Check sync

```bash
npx supabase migration list
```

Healthy: every version appears under both **Local** and **Remote**.

---

## Normal workflow (additive changes)

When remote is already in sync and you only need a schema change:

1. Create a new migration file.
2. Edit the SQL.
3. Push to remote.
4. Regenerate TypeScript types if your project uses them.

Do **not** delete old migration files in this flow.

---

## Squash migrations

Use when you want one consolidated migration file instead of incremental history.

**This project:** schema lives in `20260602202331_initial.sql`; cron / `pg_cron` jobs stay in a separate file (`20260711000000_cron_mark_overdue_pending_missing.sql`) because they require the `pg_cron` extension and `cron.schedule`.

1. **Write final schema** in a single migration — end state only, not incremental renames/drops for objects that never exist on fresh install.
2. **Respect FK order** when writing or dumping schema (parents before children).
3. **Keep local files** — one initial schema file plus any cron/extension-only migrations; remove superseded incremental files.
4. **Reset linked remote** — required; do not squash by deleting files and running `db push` alone.
5. **Verify** with `migration list` (Local = Remote for every remaining file).
6. **Restore app data** (seed admin, test data, etc.) as needed.

Optional: dump live schema after a good reset instead of hand-writing the file.

### `db push` vs `db reset --linked`

| Squash (wrong) | Squash (correct) |
| --- | --- |
| Delete local files, add new file(s), `db push` | Delete extras, keep one file, `db reset --linked` |
| Remote keeps old versions | Remote history wiped; replay from scratch |

- `db push` — apply **new** migrations on top of existing history.
- `db reset --linked` — wipe DB and replay **all** local migrations from scratch.

### After squash (this repo)

```bash
# 1. Commit the squashed migrations (2 files in supabase/migrations/)

# 2. See mismatch before fix (Remote has old versions, Local has 2)
npx supabase migration list

# 3. Wipe remote dev/staging and replay local migrations — NOT db push
npx supabase db reset --linked

# 4. Confirm sync (2 rows, Local = Remote)
npx supabase migration list

# 5. Restore admin user (uses .env.local Supabase keys)
npm run seed:admin

# 5b. Seed RBAC permission catalog + manager grants
npm run seed:rbac

# 6. Load demo semesters, classes, teachers, and students
npm run seed:demo

# Or both at once:
npm run seed

# 7. Regenerate types
npm run gen:types
```

Local-only dev (Docker): `npx supabase db reset` instead of `--linked`, then `npm run seed`.

---

## Teammates and CI

Squashing rewrites git history. After pull, each dev with a linked project should run `db reset --linked`.

**Do not squash** migrations already on **production** with real data unless you have a dedicated migration plan.

---

## Seed note

If `supabase/config.toml` references a seed file that does not exist, `db reset` may warn but still succeed. Add the seed file, disable seed in config, or use your app’s seed script.

---

## Quick commands

```bash
npx supabase migration list
npx supabase db reset              # local only
npx supabase db reset --linked     # remote dev/staging only
npx supabase migration new <name>
npx supabase db push
```

See also: [docs/cmds/migrations.md](../cmds/migrations.md), [database_explanation_v1.md](./database_explanation_v1.md).
