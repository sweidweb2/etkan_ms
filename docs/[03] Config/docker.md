# Docker — Next.js local / staging / prod

This repo Dockerizes **Next.js only**. Local Supabase is the CLI (`npx supabase start`). On the Hostinger VPS, staging and production each have **their own** CLI Supabase stack (not Cloud, not a shared VPS database).

**As-built VPS reference** (hosts, ports, deploys, findings):

- [`../[14] Deploy/README.md`](../[14]%20Deploy/README.md)
- [`../[14] Deploy/vps-staging.md`](../[14]%20Deploy/vps-staging.md)
- [`../[14] Deploy/vps-prod.md`](../[14]%20Deploy/vps-prod.md)

Mailtrap, Turnstile, and Cloudflare Workers AI are HTTPS APIs — no extra containers. Staging and prod copy the **same** SaaS keys.

Do **not** add a custom slim Supabase compose file. Official Docker deployment is still later ([`nextjs_supabase_hostinger_roadmap.md`](../nextjs_supabase_hostinger_roadmap.md)). Today both VPS databases are `npx supabase start`.

Daily local development stays on the host:

```powershell
npx supabase start
npm run dev
```

See [`local-supabase.md`](./local-supabase.md).

## Two apps on one VPS

| App | Hostname | Compose project | Container | Host port |
| --- | --- | --- | --- | --- |
| Staging | `https://staging.etkan.org` | `etkan-staging` | `etkan-staging-web` | `3001` → container `3000` |
| Production | `https://etkan.org` and `www` | `etkan-prod` | `etkan-prod-web` | `3000` → container `3000` |
| Proxy | TLS + host routing | `etkan-proxy` | `etkan-caddy` | `80` / `443` |
| Staging API | `https://api.etkan.org` | CLI `etkan_ms` | Kong | host `54321` |
| Prod API | `https://prod-api.etkan.org` | CLI `etkan_ms_prod` | Kong | host `55321` |

```
Internet → Caddy
              ├ staging.etkan.org     → :3001  (etkan-staging-web)
              ├ etkan.org / www       → :3000  (etkan-prod-web)
              ├ api.etkan.org         → :54321 (staging Kong)
              └ prod-api.etkan.org    → :55321 (prod Kong)
```

`www` and apex both serve prod Next (no redirect). See the prod deploy note on split DNS.

## Files

| File | Role |
| --- | --- |
| [`Dockerfile`](../../Dockerfile) | Multi-stage production image (`output: "standalone"`) |
| [`compose.yaml`](../../compose.yaml) | Shared `web` image build |
| [`compose.local.yaml`](../../compose.local.yaml) | Optional image smoke (not the default local workflow) |
| [`compose.staging.yaml`](../../compose.staging.yaml) | Staging container on host port `3001` |
| [`compose.prod.yaml`](../../compose.prod.yaml) | Production container on host port `3000` |
| [`compose.proxy.yaml`](../../compose.proxy.yaml) | Caddy |
| [`Caddyfile`](../../Caddyfile) | All public hosts — must stay in git (deploy uses `git checkout -f`) |
| [`.env.example`](../../.env.example) | Local key list |
| [`.env.staging.example`](../../.env.staging.example) | Staging Next template (`https://api.etkan.org`) |
| [`.env.production.example`](../../.env.production.example) | Production Next template (`https://prod-api.etkan.org`) |
| [`.env.supabase.vps.example`](../../.env.supabase.vps.example) | Official VPS Supabase env contract (future) |

`NEXT_PUBLIC_*` values are baked in at **image build** time. Pass the same file to Compose so build args and runtime env stay aligned.

## Environment files

| File | Used by |
| --- | --- |
| `.env.local` | Host `npm run dev` against local CLI Supabase |
| `.env.hosted` | Archive of hosted project keys (not loaded by Next) |
| `.env.staging` | Staging Compose (`NEXT_PUBLIC_SITE_URL=https://staging.etkan.org`) |
| `.env.production` | Production Compose (`NEXT_PUBLIC_SITE_URL=https://etkan.org`) |

Copy the `*.example` files if the gitignored files are missing. Do not commit real keys.

## GitHub Actions deploy

PRs to `dev` / `main` run **CI only** (lint, typecheck, test, `next build`). They do **not** deploy.

| Event | Workflow | What happens |
| --- | --- | --- |
| Push to `dev` | `deploy-staging.yml` | CI → **build+push GHCR** → VPS `docker pull` + restart `etkan-staging-web` |
| Push to `main` | `deploy-prod.yml` | CI → **build+push GHCR** → VPS `docker pull` + restart `etkan-prod-web` |

No `docker compose --build` on the VPS for normal deploys. Image: `ghcr.io/sweidweb2/etkan-ms:{staging\|prod}-<sha>`.

Env files on the VPS (`.env.staging`, `.env.production`) stay for **runtime** secrets (service role, Mailtrap, etc.). `NEXT_PUBLIC_*` for the running image are baked in Actions. Caddy and Supabase are **not** restarted (staging re-patches Auth `site_url` in `~/etkan_ms/supabase/config.toml` only).

Repo secrets (Settings → Secrets and variables → Actions):

| Secret | Example |
| --- | --- |
| `VPS_HOST` | `178.16.129.124` |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | Private key for that user (full `BEGIN…END` block) |
| `STAGING_SUPABASE_ANON_KEY` | Staging anon JWT (bake staging image) |
| `PROD_SUPABASE_ANON_KEY` | Prod anon JWT — put on GitHub Environment **production** |

Put the matching **public** key in `/home/deploy/.ssh/authorized_keys`. `deploy` must be able to run `docker` / `docker compose`.

## Commands (VPS)

```bash
# Emergency local build on the VPS (prefer Actions+GHCR for normal deploys)
ETKAN_WEB_IMAGE=etkan-web:local \
  docker compose --env-file .env.staging -f compose.yaml -f compose.staging.yaml up -d --build

ETKAN_WEB_IMAGE=etkan-web:local \
  docker compose --env-file .env.production -f compose.yaml -f compose.prod.yaml up -d --build

# Caddy
docker compose -f compose.proxy.yaml up -d
docker compose -f compose.proxy.yaml exec caddy caddy reload --config /etc/caddy/Caddyfile
```

Optional local image smoke:

```powershell
docker compose --env-file .env.local -f compose.yaml -f compose.local.yaml up --build
```

Stop **one** Next stack (not Caddy, not the other app):

```bash
docker compose --env-file .env.staging -f compose.yaml -f compose.staging.yaml down
docker compose --env-file .env.production -f compose.yaml -f compose.prod.yaml down
```

Do not `down` `compose.proxy.yaml` unless you intend to drop TLS for every host.

## DNS and TLS

Point `staging`, `api`, `prod-api`, `@`, and `www` at the VPS. First Let's Encrypt issue is easier with Cloudflare **DNS only** (grey cloud). Caddy container DNS must be `1.1.1.1` / `8.8.8.8`.

Open VPS firewall ports **80** and **443**.

## Auth and Turnstile

See [`supabase-auth.md`](./supabase-auth.md) and the [14] Deploy notes. Staging and prod Auth `site_url` values are **different** (two CLI stacks).

In Cloudflare Turnstile, allow `staging.etkan.org`, `etkan.org`, and `www.etkan.org`. Use that same list in `TURNSTILE_HOSTNAMES` on both Next env files.

## What is not done yet

- Official self-hosted Supabase compose (CLI stacks are live instead)
- Cloud → prod data migration — [`../[14] Deploy/cloud-to-vps.md`](../[14]%20Deploy/cloud-to-vps.md)
- JWT rotation off the CLI demo secret
- Redis, extra cron workers, Cloudflare R2
