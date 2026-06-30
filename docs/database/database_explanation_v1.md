# Database Design — Version 1

Ashlilie is a **portfolio site with admin-only auth**. The live schema is intentionally minimal at bedrock: a single `users` table linked to Supabase Auth. Canonical SQL lives in `supabase/migrations/`.

## Design goals

- **One identity table** for admin users who manage the portfolio.
- **Supabase Auth** holds credentials; `public.users` holds app profile and role.
- **RLS** so authenticated users can read their own row (middleware role resolution).
- **No customer/student tables** — public visitors do not have accounts.

## Migrations (apply in order)

| File | Purpose |
| --- | --- |
| `20260602202331_initial.sql` | Creates `users` |
| `20260603120000_link_users_auth.sql` | Adds `auth_id` FK to `auth.users` |
| `20260604120000_user_roles.sql` | Adds `user_role` enum, `role` column, RLS |
| `20260607120000_drop_non_user_tables.sql` | Removes legacy draft tables from earlier iterations |

## Entity overview

```text
auth.users (Supabase Auth)
  └── public.users (profile + role)
```

Future portfolio content tables (projects, skills, experience, etc.) will attach to this bedrock as new migrations — not documented here until they exist.

---

## Table: `users`

Application profile for **admin accounts only**. Public portfolio visitors are unauthenticated and have no row in this table.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `SERIAL` | Primary key |
| `username` | `VARCHAR(50)` | Unique, not null |
| `email` | `VARCHAR(255)` | Unique, not null |
| `password_hash` | `TEXT` | Legacy/local hash; primary auth is Supabase Auth |
| `auth_id` | `UUID` | Links to `auth.users.id`, unique |
| `role` | `user_role` | `admin` for all app users |
| `created_at` | `TIMESTAMP` | Default `CURRENT_TIMESTAMP` |

### Enum: `user_role`

```sql
CREATE TYPE user_role AS ENUM ('admin', 'customer');
```

The enum includes `customer` from an earlier template. **Ashlilie only uses `admin`.** New accounts are created with `role = 'admin'` via `scripts/seed-admin.ts` or controlled signup flows.

### Row-level security

| Policy | Operation | Rule |
| --- | --- | --- |
| `users_select_own` | `SELECT` | `auth_id = auth.uid()` for `authenticated` role |

Writes to `users` go through the **service role** in server actions/services during registration and seeding.

---

## Auth flow (summary)

1. Admin signs in via Supabase Auth (`/auth/login`).
2. Middleware calls `resolveUserRole()` → reads `users.role` by `auth_id`.
3. Admin routes (`/admin/*`) require `role = admin`.
4. Public routes (`/`, portfolio pages) are open to everyone.

See `docs/config/supabase-auth.md` for redirect URL setup.

---

## Type generation

After schema changes:

```bash
npx supabase gen types typescript \
  --project-id zqxpfdcgnotprzyojamu \
  > types/supabase.ts
```

Replace the project ID if your Supabase project differs (`supabase/.temp/project-ref`).

---

## Summary

Version 1 is **admin-auth bedrock only**: one `users` table, Supabase Auth integration, and RLS for self-read. Portfolio content schema will be added in later migrations as features are built.
