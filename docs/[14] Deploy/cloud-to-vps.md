# Cloud → VPS prod data copy

Copy the **hosted** Supabase project (`.env.hosted` / `*.supabase.co`) into the **prod** CLI stack on Hostinger.

This does **not** change DNS or Caddy. etkan.org already uses `https://prod-api.etkan.org`. You are filling that empty notebook.

Do **not** run these steps against staging (`api.etkan.org` / port `54322` / `~/etkan_ms`).

If a step fails, **stop**. Do not wipe prod again. Cloud is the source of truth until the end.

Never commit dump files. Never paste DB URLs or keys into chat.

| | Cloud (source) | VPS prod (destination) |
| --- | --- | --- |
| App | Vercel / any client on `*.supabase.co` | `https://www.etkan.org` |
| API | `https://<project-ref>.supabase.co` | `https://prod-api.etkan.org` |
| Postgres | Dashboard → Database → **direct** URI port `5432` | `supabase_db_etkan_ms_prod` (host `55322`) |
| Folder | hosted project | `/home/deploy/etkan_supabase_prod` |

VPS dump folder: `/tmp/cloud-dump/`

## What we hit in the live run (2026-09-27)

- `npx supabase db dump` on **Windows** needs Docker Desktop. Dump on the **VPS** instead.
- A data dump **without** `--schema public` includes **auth first**. After Auth is restored, do **not** load that whole file. Cut `COPY "public".…` only (`02-public-only.sql`).
- Cloud still had `trainer`. VPS migrations dropped it. Widen `role_permissions_role_check`, load the rest from `role_permissions`, then `trainer` → `teacher` and `DELETE` trainer grants, then tighten the check again.
- `storage.buckets` already exist from migrations. Load **`storage.objects` only** (`04-objects-only.sql`).
- Image **bytes** are a later step: same bucket + path, then replace `https://<ref>.supabase.co` with `https://prod-api.etkan.org` in URL columns.

## Step 1 — Prepare

```bash
docker exec etkan-prod-web printenv NEXT_PUBLIC_SUPABASE_URL
docker exec supabase_db_etkan_ms_prod psql -U postgres -c "select count(*) as auth_users from auth.users;"
```

Want `https://prod-api.etkan.org` and a small user count before wipe.

## Step 2 — Dump on the VPS

```bash
mkdir -p /tmp/cloud-dump && chmod 700 /tmp/cloud-dump
export CLOUD_DB_URL="postgresql://postgres:YOUR_DB_PASSWORD@db.YOUR_REF.supabase.co:5432/postgres"
cd /home/deploy/etkan_ms
npx supabase db dump --db-url "$CLOUD_DB_URL" -f /tmp/cloud-dump/01-cloud-schema.sql
npx supabase db dump --db-url "$CLOUD_DB_URL" --data-only --use-copy -f /tmp/cloud-dump/02-cloud-public-data.sql
npx supabase db dump --db-url "$CLOUD_DB_URL" --data-only --use-copy --schema auth -f /tmp/cloud-dump/03-cloud-auth-data.sql
npx supabase db dump --db-url "$CLOUD_DB_URL" --data-only --use-copy --schema storage -f /tmp/cloud-dump/04-cloud-storage-data.sql
unset CLOUD_DB_URL
ls -lh /tmp/cloud-dump
```

Prefer adding `--schema public` on the second dump next time so Auth is not duplicated.

## Step 3 — Wipe prod seed only

Confirm `auth_users` is still the seed (`1`), then truncate public + auth users + storage.objects (see the live session / previous long SQL). Wrong container = wipe staging.

## Step 4 — Restore Auth

```bash
docker cp /tmp/cloud-dump/03-cloud-auth-data.sql supabase_db_etkan_ms_prod:/tmp/03-cloud-auth-data.sql
docker exec -i supabase_db_etkan_ms_prod psql -U postgres -v ON_ERROR_STOP=1 -c "SET session_replication_role = replica;" -f /tmp/03-cloud-auth-data.sql
```

## Step 5 — Restore public (cut, then trainer)

```bash
awk 'NR<=27{print; next} /^COPY "public"\./{p=1} /^COPY "/ && $0 !~ /^COPY "public"\./{p=0} p' /tmp/cloud-dump/02-cloud-public-data.sql > /tmp/cloud-dump/02-public-only.sql
```

If `role_permissions` fails on `trainer`:

```sql
alter table public.role_permissions drop constraint if exists role_permissions_role_check;
alter table public.role_permissions add constraint role_permissions_role_check
  check (role in ('admin','manager','co-manager','ceo','supervisor','crm','teacher','student','trainer'));
```

Load from `role_permissions` to EOF (`02-public-rest.sql`), then:

```sql
update public.profiles set role = 'teacher' where role = 'trainer';
update public.notifications set audience = 'teacher' where audience = 'trainer';
delete from public.role_permissions where role = 'trainer';
```

Put the check back **without** `trainer`.

## Step 6 — Restore storage.objects only

Skip `COPY storage.buckets`. Load `04-objects-only.sql` (header + objects COPY block).

## Step 7 — Sequences

`setval` for `public` / `auth` / `storage` serials (see live SQL `DO` block).

## Step 8 — Files + URL host

Upload bytes to the same bucket + path on `prod-api`. Then replace Cloud host in stored URLs.

## Step 9 — Verify

`https://www.etkan.org`, Caddy headers, Cloud email login, counts vs Cloud. Staging untouched.

## Step 10 — After

Keep Cloud. Delete `/tmp/cloud-dump` when sure. Do not `db reset` prod.
