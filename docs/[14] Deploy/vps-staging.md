# Staging — as-built (Hostinger VPS)

Reference for later DevOps. Staging is a **full second house**: own Next container, own Supabase CLI stack, own public names. It does not share a database with production.

Recorded **2026-09-27** after the first VPS bring-up.

## What is live

| Check | Result |
| --- | --- |
| Site | `https://staging.etkan.org` — Caddy → `etkan-staging-web` |
| API | `https://api.etkan.org` — Caddy → Kong on host port **54321** |
| Auth health | `https://api.etkan.org/auth/v1/health` returns GoTrue JSON |
| App env | `NEXT_PUBLIC_SITE_URL=https://staging.etkan.org` |
| App API env | `NEXT_PUBLIC_SUPABASE_URL=https://api.etkan.org` |
| Database | Self-hosted CLI stack in `/home/deploy/etkan_ms` (`project_id = etkan_ms`) |
| Not live here | `etkan.org`, Cloud `*.supabase.co`, Vercel |

The public **homepage HTML** is the same Next.js marketing code as prod. That is not a data copy. Panel data is whatever was seeded or created **on this stack**.

## How it is constructed

```
Browser
  → DNS staging / api  →  178.16.129.124
  → etkan-caddy :443
       ├ staging.etkan.org  →  127.0.0.1:3001  →  etkan-staging-web
       └ api.etkan.org      →  127.0.0.1:54321 →  Kong (CLI stack etkan_ms)
                                                    ├ Auth / PostgREST / Storage
                                                    └ Postgres :54322
```

One git folder, two Next containers. Staging Compose project name: `etkan-staging`.

| Piece | Path / name |
| --- | --- |
| Code + staging env + Caddyfile | `/home/deploy/etkan_ms` |
| Staging env (never overwritten by git) | `/home/deploy/etkan_ms/.env.staging` |
| CLI config | `/home/deploy/etkan_ms/supabase/config.toml` |
| Next image | `Dockerfile` + `compose.yaml` + `compose.staging.yaml` |
| Host publish | `3001:3000` |
| `extra_hosts` | `host.docker.internal` and `api.etkan.org` → host-gateway (avoids hairpin TLS) |

`NEXT_PUBLIC_*` is passed as Docker **build args**. Changing the URL or anon key requires `up -d --build`, not only a container restart.

## DNS (Namecheap)

| Host | Type | Value |
| --- | --- | --- |
| `staging` | A | `178.16.129.124` |
| `api` | A | `178.16.129.124` |

Keep these **DNS only** (no orange-cloud proxy) so Let's Encrypt HTTP-01 hits this VPS.

## Auth

Committed `supabase/config.toml` keeps `site_url = "http://127.0.0.1:3000"` for laptops.

On the VPS, `scripts/vps-patch-supabase-auth.sh` rewrites that to `https://staging.etkan.org`. Staging deploy runs the patch **after** `git checkout -f` (checkout would otherwise restore localhost).

`additional_redirect_urls` in git already includes staging and prod callbacks. After changing `[auth]` in `config.toml`, restart the **staging** CLI stack or GoTrue keeps the old values:

```bash
cd /home/deploy/etkan_ms
npx supabase stop
npx supabase start
```

Do not run that from the prod folder. Do not point staging Auth at `https://etkan.org`.

## Deploy

| Trigger | Workflow |
| --- | --- |
| Push to `dev` or **workflow_dispatch** | `.github/workflows/deploy-staging.yml` |

Flow:

1. Reusable CI (lint, typecheck, test, build gate).
2. **Build the Docker image in GitHub Actions** and push to GHCR (`ghcr.io/sweidweb2/etkan-ms:staging-<sha>`).
3. SSH as `deploy` (`VPS_HOST` / `VPS_USER` / `VPS_SSH_KEY`).
4. `cd /home/deploy/etkan_ms`, `git checkout -f -B dev FETCH_HEAD`
5. `bash scripts/vps-deploy-staging.sh` — login GHCR, **`docker pull`**, patch Auth `site_url`, restart **only** `etkan-staging-web` (`--no-build`), curl `:3001` until healthy.

Required secret: `STAGING_SUPABASE_ANON_KEY` (repo secret; same anon value as `.env.staging`).

PRs to `dev` run **CI only**. They do not deploy.

Checkout `-f` is required because the VPS Caddyfile (and sometimes compose) diverge from git. **Caddyfile in git must match the live file** or staging deploys wipe prod host blocks too (same file).

## Process we actually used (findings)

Bring-up order that worked:

1. Clone `/home/deploy/etkan_ms`, create `.env.staging`.
2. First attempt used hosted Cloud keys / a placeholder `https://<project-ref>.supabase.co` — Next threw **Invalid supabaseUrl**. Fix: `NEXT_PUBLIC_SUPABASE_URL=https://api.etkan.org` and **rebuild**.
3. `npx supabase start` in `~/etkan_ms` (Kong **54321**, not 8000).
4. Merge SaaS keys from a copied `.env.hosted` + `npx supabase status -o env` (do not paste keys into chat).
5. Seed RBAC + manager (`seed:rbac`, `seed:manager`) against this API.
6. Start Caddy (`compose.proxy.yaml`).

Problems that blocked staging (and how they were fixed):

| Symptom | Cause | Fix |
| --- | --- | --- |
| Caddy cannot bind `:80` | Leftover Traefik (`/docker/traefik`, container `traefik-traefik-1`) | Stop Traefik; `docker update --restart=no`. Confirm it stays down after reboot. |
| Let's Encrypt / DNS fail in Caddy | Container used host DNS `127.0.0.53` | `dns: [1.1.1.1, 8.8.8.8]` as a **sibling** of `extra_hosts` (not nested under it — that broke YAML) |
| `compose.proxy.yaml` invalid | `dns` nested under `extra_hosts` | Rewrite the file; `up -d --force-recreate` |
| GitHub deploy `script_stop` / missing host | Wrong appleboy inputs; empty secrets; first homemade rsync action | `appleboy/ssh-action@v1.2.2`; set repo secrets |
| `git checkout` refused | Dirty VPS `Caddyfile` / compose | `git checkout -f` — then **commit** live Caddyfile |
| Health `000` / 502 | Curl immediately after recreate | Retry loop in `vps-deploy-staging.sh` |
| SSH as `root` vs `~/etkan_ms` | Deploy user home is `/home/deploy` | Always `cd /home/deploy/etkan_ms` |

`npm audit` noise on the VPS is not an app outage.

## What a staging deploy must not do

- Do not overwrite `.env.staging`.
- Do not `supabase stop` prod (`~/etkan_supabase_prod`).
- Do not rebuild `etkan-prod-web`.
- Do not need to reload Caddy unless the Caddyfile in git changed.

## Later DevOps on staging

- Rotate off the default CLI JWT (`iss: supabase-demo`) when leaving “lab” mode.
- Replace CLI Supabase with official Docker when you are ready (new ports/URLs — update `.env.staging` and Caddy `api` block, then rebuild Next).
- If Auth emails still show localhost, re-run the patch script and restart the **staging** CLI stack only.
- Turnstile: widget hostnames must include `staging.etkan.org`.
