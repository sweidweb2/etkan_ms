# Docker — Next.js local / staging / prod

This repo Dockerizes **Next.js only**. Local Supabase is the CLI (`npx supabase start`). Staging and production Next containers will talk to a **self-hosted** Supabase API (`https://api.etkan.org`) once that stack is added — env templates are ready; do **not** `up` Supabase from this repo yet.

Mailtrap, Turnstile, and Cloudflare Workers AI are HTTPS APIs — no extra containers. Staging and prod use the **same** SaaS keys.

Do **not** add a custom slim Supabase compose file. Use the official Docker deployment later ([`nextjs_supabase_hostinger_roadmap.md`](../nextjs_supabase_hostinger_roadmap.md)).

Daily local development stays on the host:

```powershell
npx supabase start
npm run dev
```

See [`local-supabase.md`](./[03]%20Config/local-supabase.md).

## Two apps on one VPS

| App | Hostname | Compose project | Container | Host port |
| --- | --- | --- | --- | --- |
| Staging | `https://staging.etkan.org` | `etkan-staging` | `etkan-staging-web` | `3001` → container `3000` |
| Production | `https://etkan.org` | `etkan-prod` | `etkan-prod-web` | `3000` → container `3000` |
| Proxy | TLS + host routing | `etkan-proxy` | `etkan-caddy` | `80` / `443` |

```
Internet → Caddy
              ├ staging.etkan.org → 127.0.0.1:3001
              ├ etkan.org         → 127.0.0.1:3000
              └ api.etkan.org     → 127.0.0.1:8000  (Kong; enable in Caddyfile later)
Both Next containers → same self-hosted Supabase (when that stack is running)
```

`www.etkan.org` redirects to `https://etkan.org`.

## Files

| File | Role |
| --- | --- |
| [`Dockerfile`](../Dockerfile) | Multi-stage production image (`output: "standalone"`) |
| [`compose.yaml`](../compose.yaml) | Shared `web` image build |
| [`compose.local.yaml`](../compose.local.yaml) | Optional image smoke (not the default local workflow) |
| [`compose.staging.yaml`](../compose.staging.yaml) | Staging container on host port `3001` |
| [`compose.prod.yaml`](../compose.prod.yaml) | Production container on host port `3000` |
| [`compose.proxy.yaml`](../compose.proxy.yaml) | Caddy for the two hostnames |
| [`Caddyfile`](../Caddyfile) | App hosts; `api.etkan.org` block commented until Kong is up |
| [`.env.example`](../.env.example) | Local key list |
| [`.env.staging.example`](../.env.staging.example) | Staging Next template |
| [`.env.production.example`](../.env.production.example) | Production Next template |
| [`.env.supabase.vps.example`](../.env.supabase.vps.example) | Official VPS Supabase env contract |

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

PRs to `dev` / `main` run **CI only** (lint, typecheck, test, build). They do **not** deploy.

Same idea as a Hostinger Laravel deploy: GitHub SSHs in, `git pull`s, then rebuilds the app.

| Event | Workflow | What happens |
| --- | --- | --- |
| Push to `dev` | `deploy-staging.yml` | CI, then SSH → `git pull` → rebuild `etkan-staging-web` |
| Push to `main` | `deploy-prod.yml` | CI, then SSH → `git pull` → rebuild `etkan-prod-web` |

Env files on the VPS (`.env.staging`, `.env.production`) stay on the server. Caddy and Supabase are **not** restarted.

Repo secrets (Settings → Secrets and variables → Actions):

| Secret | Example |
| --- | --- |
| `VPS_HOST` | `178.16.129.124` |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | Private key for that user (full `BEGIN…END` block) |

Put the matching **public** key in `/home/deploy/.ssh/authorized_keys`. `deploy` must be able to run `docker compose`.

## Commands (VPS)

```powershell
# Staging image + container
docker compose --env-file .env.staging -f compose.yaml -f compose.staging.yaml up -d --build

# Production image + container
docker compose --env-file .env.production -f compose.yaml -f compose.prod.yaml up -d --build

# Caddy (after both apps are listening)
docker compose -f compose.proxy.yaml up -d
```

Optional local image smoke:

```powershell
docker compose --env-file .env.local -f compose.yaml -f compose.local.yaml up --build
```

Stop one stack:

```powershell
docker compose -f compose.yaml -f compose.staging.yaml down
docker compose -f compose.yaml -f compose.prod.yaml down
docker compose -f compose.proxy.yaml down
```

## DNS and TLS

Point `staging.etkan.org`, `etkan.org`, `www.etkan.org`, and (when enabling Kong) `api.etkan.org` at the VPS. First Let's Encrypt issue is easier with Cloudflare **DNS only** (grey cloud). After certificates exist, you can use Full (strict).

Open VPS firewall ports **80** and **443**. App ports `3000` / `3001` can stay localhost-only if Caddy runs on the same machine.

## Auth and Turnstile

See [`supabase-auth.md`](./supabase-auth.md). On self-hosted Auth, set Site URL to `https://etkan.org` and additional redirects to both `/auth/callback` URLs (see `.env.supabase.vps.example`).

In Cloudflare Turnstile, allow `staging.etkan.org`, `etkan.org`, and `www.etkan.org`. Use that same list in `TURNSTILE_HOSTNAMES` on both Next env files.

## What is not started yet

- Official self-hosted Supabase containers (env template only)
- Redis, extra cron workers
- Cloudflare R2
