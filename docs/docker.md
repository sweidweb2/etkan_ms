# Docker — Next.js local / staging / prod

This repo Dockerizes **Next.js only**. Local Supabase is the CLI (`npx supabase start`). Staging and production keep **hosted** Supabase for now. Mailtrap, Turnstile, and Cloudflare Workers AI are HTTPS APIs — no extra containers.

Self-hosting Supabase on a VPS is a later step: [`nextjs_supabase_hostinger_roadmap.md`](./nextjs_supabase_hostinger_roadmap.md). Do **not** add a custom slim Supabase Compose file.

Daily local development stays on the host:

```powershell
npx supabase start
npm run dev
```

See [`local-supabase.md`](./local-supabase.md).

## Files

| File | Role |
| --- | --- |
| [`Dockerfile`](../Dockerfile) | Multi-stage production image (`output: "standalone"`) |
| [`compose.yaml`](../compose.yaml) | Shared `web` service |
| [`compose.local.yaml`](../compose.local.yaml) | Optional image smoke (not the default local workflow) |
| [`compose.staging.yaml`](../compose.staging.yaml) | Staging overlay |
| [`compose.prod.yaml`](../compose.prod.yaml) | Production overlay |
| [`.env.example`](../.env.example) | Committed key list — copy, do not commit secrets |

`NEXT_PUBLIC_*` values are baked in at **image build** time. Pass the same file to Compose so build args and runtime env stay aligned:

```powershell
docker compose --env-file .env.staging -f compose.yaml -f compose.staging.yaml up -d --build
```

## Environment files

Copy [`.env.example`](../.env.example):

| File | Used by |
| --- | --- |
| `.env.local` | Host `npm run dev` against local CLI Supabase |
| `.env.hosted` | Archive of hosted project keys (not loaded by Next) |
| `.env.staging` | Staging Compose |
| `.env.production` | Production Compose |

Local CLI keys come from `npx supabase status` (`http://127.0.0.1:54321`). Staging/prod use the hosted project URL and dashboard keys.

A Next **container** cannot reach the host CLI API at `127.0.0.1:54321` (that address is inside the container). Use `npm run dev` on the host against local Supabase.

## Commands

```powershell
# Optional: build and run the production image locally
docker compose --env-file .env.local -f compose.yaml -f compose.local.yaml up --build

# Staging
docker compose --env-file .env.staging -f compose.yaml -f compose.staging.yaml up -d --build

# Production
docker compose --env-file .env.production -f compose.yaml -f compose.prod.yaml up -d --build
```

Stop:

```powershell
docker compose -f compose.yaml -f compose.local.yaml down
```

The image listens on port `3000`. Put Caddy or Nginx in front on the VPS later; Compose does not include a reverse proxy.

## What is not in these files

- Official self-hosted Supabase stack
- Redis, extra cron workers, or nginx
- Cloudflare R2
