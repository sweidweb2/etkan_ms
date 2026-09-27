# Docker — Next.js local / staging / prod

This repo Dockerizes **Next.js only**. Local Supabase is the CLI (`npx supabase start`). Staging and production keep **hosted** Supabase for now. Mailtrap, Turnstile, and Cloudflare Workers AI are HTTPS APIs — no extra containers.

Self-hosting Supabase on a VPS is a later step: [`nextjs_supabase_hostinger_roadmap.md`](./nextjs_supabase_hostinger_roadmap.md). Do **not** add a custom slim Supabase compose file.

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
              └ etkan.org         → 127.0.0.1:3000
Each Next container → hosted Supabase
```

`www.etkan.org` redirects to `https://etkan.org`.

Both apps currently share the **same** hosted Supabase project. Staging writes hit the same database as production until you create a separate staging project.

## Files

| File | Role |
| --- | --- |
| [`Dockerfile`](../Dockerfile) | Multi-stage production image (`output: "standalone"`) |
| [`compose.yaml`](../compose.yaml) | Shared `web` image build |
| [`compose.local.yaml`](../compose.local.yaml) | Optional image smoke (not the default local workflow) |
| [`compose.staging.yaml`](../compose.staging.yaml) | Staging container on host port `3001` |
| [`compose.prod.yaml`](../compose.prod.yaml) | Production container on host port `3000` |
| [`compose.proxy.yaml`](../compose.proxy.yaml) | Caddy for the two hostnames |
| [`Caddyfile`](../Caddyfile) | `staging.etkan.org` and `etkan.org` |
| [`.env.example`](../.env.example) | Local key list |
| [`.env.staging.example`](../.env.staging.example) | Staging template |
| [`.env.production.example`](../.env.production.example) | Production template |

`NEXT_PUBLIC_*` values are baked in at **image build** time. Pass the same file to Compose so build args and runtime env stay aligned.

## Environment files

| File | Used by |
| --- | --- |
| `.env.local` | Host `npm run dev` against local CLI Supabase |
| `.env.hosted` | Archive of hosted project keys (not loaded by Next) |
| `.env.staging` | Staging Compose (`NEXT_PUBLIC_SITE_URL=https://staging.etkan.org`) |
| `.env.production` | Production Compose (`NEXT_PUBLIC_SITE_URL=https://etkan.org`) |

Copy the `*.example` files if the gitignored files are missing. Do not commit real keys.

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

Point `staging.etkan.org`, `etkan.org`, and `www.etkan.org` at the VPS. First Let's Encrypt issue is easier with Cloudflare **DNS only** (grey cloud). After certificates exist, you can use Full (strict).

Open VPS firewall ports **80** and **443**. App ports `3000` / `3001` can stay localhost-only if Caddy runs on the same machine.

## Auth and Turnstile (hosted dashboard)

See [`[03] Config/supabase-auth.md`](./[03]%20Config/supabase-auth.md). You must add both callback URLs on the **hosted** project. This repo cannot change the dashboard for you.

In Cloudflare Turnstile, allow hostnames `staging.etkan.org`, `etkan.org`, and `www.etkan.org`.

## What is not in these files

- Official self-hosted Supabase stack
- Redis, extra cron workers
- Cloudflare R2
