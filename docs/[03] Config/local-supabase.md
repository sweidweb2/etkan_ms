# Local Supabase — implementation steps

Follow these steps in order. This is **local Docker on your PC**, not the Hostinger VPS plan ([`nextjs_supabase_hostinger_roadmap.md`](../nextjs_supabase_hostinger_roadmap.md)).

The repo is already initialized. Do **not** run `supabase init`.

**When you finish:** Next.js talks to `http://127.0.0.1:54321` (Auth + Postgres API + Storage). Docker uses about **2–3 GB** RAM.

---

## Step 0 — Check you have what you need

- [ ] Windows PC with **at least 16 GB** RAM (8 GB total is too tight with browser + Next.js)
- [ ] Node.js + npm (this repo)
- [ ] About **4 GB** free to give Docker (slim stack is ~2–3 GB; leave headroom)
- [ ] Internet for the first image download

You do **not** need to clone the official Supabase Docker GitHub repo.

---

## Step 1 — Install and start Docker Desktop

1. Install [Docker Desktop for Windows](https://docs.docker.com/desktop/setup/install/windows-install/).
2. Keep the **WSL 2** backend (installer default).
3. If Docker asks for virtualization, enable it in BIOS.
4. Open Docker Desktop → **Settings → Resources → Memory** → set **at least 4 GB**.
5. Start Docker Desktop and wait until it says it is running.

```powershell
docker version
docker compose version
```

Both must print a version. If they fail, Docker is not ready — wait and retry.

---

## Step 2 — Confirm the slim service list (already in the repo)

Open `supabase/config.toml` and confirm:

| Setting | Must be |
| --- | --- |
| `[api] enabled` | `true` |
| `[db]` (Postgres) | present (always on) |
| `[auth] enabled` | `true` |
| `[storage] enabled` | `true` |
| `[realtime] enabled` | `true` |
| `[studio] enabled` | `false` |
| `[inbucket] enabled` | `false` |
| `[edge_runtime] enabled` | `false` |
| `[analytics] enabled` | `false` |
| `[storage.s3_protocol] enabled` | `false` |
| `[db.pooler] enabled` | `false` |
| `[api] schemas` | `["public"]` (no GraphQL) |

That is what this app needs: **Postgres + Auth + API + Storage + Realtime** (manager live notification toasts). Nothing else.

Want Studio later? Set `[studio] enabled = true`, then redo Step 4.

---

## Step 3 — Install npm packages

From the repo root:

```powershell
cd C:\Users\User\Desktop\etkan_ms
npm install
```

The Supabase CLI is the `supabase` package. Always run it as `npx supabase`.

---

## Step 4 — Start the local stack

Docker Desktop must already be running.

```powershell
npx supabase start
```

First run downloads images and can take several minutes. If it errors about Docker or health checks, wait 30 seconds and run it again.

Then print URLs and keys:

```powershell
npx supabase status
```

Copy these from the output (local keys, **not** the hosted dashboard keys):

- API URL → should be `http://127.0.0.1:54321`
- Anon / publishable key
- Service role key

`start` also applies `supabase/migrations/` (tables, RPCs, RLS, Storage buckets).

A warning about missing `supabase/seed.sql` is OK. Ignore it.

---

## Step 5 — Point the app at local Supabase

Copy [`.env.example`](../../.env.example) to `.env.local` if you do not have one. For a **local** stack the required keys must look like this:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase status>
SUPABASE_SERVICE_ROLE_KEY=<service role key from supabase status>
```

Do **not** leave `https://xxxx.supabase.co` here if you want to use Docker.

Restart the Next.js dev server after changing `NEXT_PUBLIC_*` values.

---

## Step 6 — Put data in the local database

Pick **one** path.

### Path A — Empty local DB + seed users (fastest)

Use this to confirm the stack works before cloning production.

```powershell
npx supabase db reset
npm run seed:rbac
npm run seed:admin
npm run seed:manager
```

Optional demo rows:

```powershell
npm run seed:demo
```

Then go to **Step 7**.

### Path B — Copy hosted data to local

Do this only after Path A has worked once, or if you already know the stack starts cleanly.

#### B1 — Link the hosted project

```powershell
npx supabase login
npx supabase link --project-ref diqqcfnrysgzeiqfadic
npx supabase migration list
```

Confirm the project ref in the hosted dashboard if yours is different (`npm run gen:types` uses `diqqcfnrysgzeiqfadic`).

**Local** and **Remote** versions in `migration list` must match. If they do not, fix schema first: [`[05] Database/migration-reset-and-squash.md`](../[05]%20Database/migration-reset-and-squash.md). Do not restore across a mismatch.

Never run `npx supabase db reset --linked` on production. That wipes the **hosted** database.

#### B2 — Dump hosted data

Dumps contain emails, password hashes, and student data. Do **not** commit them.

```powershell
mkdir supabase\dumps
npx supabase db dump --linked --data-only --schema auth -f supabase/dumps/auth.sql
npx supabase db dump --linked --data-only -f supabase/dumps/public.sql
```

Default dump skips `auth` and file bytes. That is why there are two SQL files.

#### B3 — Restore into local (auth first)

```powershell
npx supabase db reset
```

PowerShell cannot redirect with `<`. Use `cmd`:

```powershell
cmd /c "docker exec -i supabase_db_etkan_ms psql -U postgres -d postgres < supabase\dumps\auth.sql"
cmd /c "docker exec -i supabase_db_etkan_ms psql -U postgres -d postgres < supabase\dumps\public.sql"
```

Container name is `supabase_db_etkan_ms` (`project_id` in `config.toml`). Confirm with `docker ps`.

If public restore fails on a duplicate `app_settings` row:

```powershell
docker exec -it supabase_db_etkan_ms psql -U postgres -d postgres -c "delete from public.app_settings;"
```

Then run the public restore command again.

After restore: log in again (old sessions use the hosted JWT). Passwords should still work.

#### B4 — Copy Storage files (optional)

SQL dumps do **not** include files. Skip this if you only need table data.

```powershell
mkdir supabase\dumps\storage

npx supabase storage cp -r ss://projects/ supabase/dumps/storage/projects --experimental --linked
npx supabase storage cp -r ss://blogs/ supabase/dumps/storage/blogs --experimental --linked
npx supabase storage cp -r ss://auther/ supabase/dumps/storage/auther --experimental --linked
npx supabase storage cp -r ss://workshops/ supabase/dumps/storage/workshops --experimental --linked
npx supabase storage cp -r ss://registration/ supabase/dumps/storage/registration --experimental --linked
npx supabase storage cp -r ss://student-task-uploads/ supabase/dumps/storage/student-task-uploads --experimental --linked
npx supabase storage cp -r ss://gallery/ supabase/dumps/storage/gallery --experimental --linked

npx supabase storage cp -r supabase/dumps/storage/projects ss://projects/ --experimental --local
npx supabase storage cp -r supabase/dumps/storage/blogs ss://blogs/ --experimental --local
npx supabase storage cp -r supabase/dumps/storage/auther ss://auther/ --experimental --local
npx supabase storage cp -r supabase/dumps/storage/workshops ss://workshops/ --experimental --local
npx supabase storage cp -r supabase/dumps/storage/registration ss://registration/ --experimental --local
npx supabase storage cp -r supabase/dumps/storage/student-task-uploads ss://student-task-uploads --experimental --local
npx supabase storage cp -r supabase/dumps/storage/gallery ss://gallery/ --experimental --local
```

#### Gallery Drive → Storage (optional)

One-time move from `public/drive images/google_drive_images.json` into the local `gallery` bucket (+ dump for later deploy):

```powershell
npm run migrate:gallery-drive
```

Restore the same files into another Supabase (local or VPS) without hitting Drive again:

```powershell
npm run migrate:gallery-from-dump
```

See `docs/gallery-feature/PLAN.md` → “Drive → Storage migration”.

Check one bucket:

```powershell
npx supabase storage ls ss://projects --experimental --local
```

Do not copy files by dropping them into the Docker volume. Storage needs `storage.objects` rows; `storage cp` creates them.

Rows that store a full `https://<project>.supabase.co/storage/...` URL still point at **hosted** files until you rewrite them to `http://127.0.0.1:54321`.

---

## Step 7 — Run the app

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- Path A: log in with the seeded admin/manager credentials from those scripts.
- Path B: log in with a hosted user (manager) email and password.

---

## Step 8 — Verify it is really local

- [ ] `npx supabase status` shows API `http://127.0.0.1:54321`
- [ ] `.env.local` uses that URL and the **status** keys
- [ ] Login works
- [ ] A Storage upload works (project image, workshop file, or similar)
- [ ] `docker stats` shows a few containers, not Studio / Realtime / Logflare / Edge

---

## Daily commands (after setup)

```powershell
npx supabase start              # start (safe if already up)
npx supabase status             # URLs + keys
npx supabase stop               # stop; keep DB + files
npx supabase stop --no-backup   # stop and delete local DB + Storage
npx supabase db reset           # wipe local DB, replay migrations
```

`npx supabase db push` updates the **linked remote**. For local schema only, add a migration and run `npx supabase db reset`.

---

## Optional — turn a service back on

Edit `supabase/config.toml`, then:

```powershell
npx supabase stop
npx supabase start
```

| Want | Set |
| --- | --- |
| Local dashboard | `[studio] enabled = true` → [http://127.0.0.1:54323](http://127.0.0.1:54323) |
| Inspect Auth emails | `[inbucket] enabled = true` → [http://127.0.0.1:54324](http://127.0.0.1:54324) |

App email still goes through Mailtrap. Auth confirmations are off locally.

---

## Safety

- Do not commit `supabase/dumps/`.
- Do not `db reset --linked` on production.
- Do not `db push` unless you intend to change the hosted database.

---

## Related

- Next.js Docker (staging/prod image): [`docker.md`](../docker.md)
- Auth URLs: [`supabase-auth.md`](./supabase-auth.md)
- Migrations: [`[02] CMDs/migrations.md`](../[02]%20CMDs/migrations.md)
- Reset / squash: [`[05] Database/migration-reset-and-squash.md`](../[05]%20Database/migration-reset-and-squash.md)
- Official CLI: [https://supabase.com/docs/guides/local-development](https://supabase.com/docs/guides/local-development)
