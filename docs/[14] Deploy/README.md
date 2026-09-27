# VPS deploy reference (Hostinger)

Snapshot of **what is actually running** after the September 2026 cutover. Use this before changing DNS, Caddy, Compose, or GitHub Actions.

- Staging (own app + own DB): [`vps-staging.md`](./vps-staging.md)
- Production (own app + own DB): [`vps-prod.md`](./vps-prod.md)
- Next.js Docker files (commands): [`../[03] Config/docker.md`](../[03]%20Config/docker.md)
- Auth URLs: [`../[03] Config/supabase-auth.md`](../[03]%20Config/supabase-auth.md)

The older [`../nextjs_supabase_hostinger_roadmap.md`](../nextjs_supabase_hostinger_roadmap.md) is a **plan**. These files are the **as-built** state.

## One VPS, two houses

Same machine: Hostinger VPS `178.16.129.124` (Ubuntu). Same git clone for **both** Next apps. **Two** Supabase CLI stacks. **Not** one shared database.

| | Staging | Production |
| --- | --- | --- |
| Public site | `https://staging.etkan.org` | `https://www.etkan.org` and `https://etkan.org` |
| Next container | `etkan-staging-web` host `:3001` | `etkan-prod-web` host `:3000` |
| Env file (gitignored, on disk) | `/home/deploy/etkan_ms/.env.staging` | `/home/deploy/etkan_ms/.env.production` |
| Supabase folder | `/home/deploy/etkan_ms` (`npx supabase start`) | `/home/deploy/etkan_supabase_prod` |
| CLI `project_id` | `etkan_ms` | `etkan_ms_prod` |
| Kong / API host port | `54321` | `55321` |
| Postgres host port | `54322` | `55322` |
| Public API | `https://api.etkan.org` | `https://prod-api.etkan.org` |
| Auth `site_url` | `https://staging.etkan.org` | `https://etkan.org` |
| GitHub deploy | push `dev` → `deploy-staging.yml` | push `main` → `deploy-prod.yml` |
| Database contents | Staging seed / test data | New seed + 1 manager. **Not** a Cloud dump |

Shared on purpose: Mailtrap, Turnstile, Cloudflare AI keys (HTTPS SaaS). Shared by accident today: **default CLI JWT secret** on both stacks — rotate before treating this as hardened production.

## Shared proxy (do not treat as “staging only” or “prod only”)

| Piece | Value |
| --- | --- |
| Compose | `compose.proxy.yaml` (`etkan-proxy`) |
| Container | `etkan-caddy` |
| Config | `/home/deploy/etkan_ms/Caddyfile` bind-mounted read-only |
| Ports | host `80` / `443` |
| Container DNS | `1.1.1.1` and `8.8.8.8` (host `127.0.0.53` is dead inside Docker) |

Caddy routes:

| Host | Upstream |
| --- | --- |
| `staging.etkan.org` | `host.docker.internal:3001` |
| `api.etkan.org` | `:54321` (staging Kong) |
| `prod-api.etkan.org` | `:55321` (prod Kong) |
| `etkan.org` | `:3000` (prod Next) |
| `www.etkan.org` | `:3000` (prod Next; **no** redirect to apex) |

Deploys run `git checkout -f` in `/home/deploy/etkan_ms`. **Commit Caddyfile in git** or the next deploy reverts the live proxy.

Deploys rebuild **only** the matching Next container. They do **not** restart Caddy or either Supabase stack (except staging re-patches `supabase/config.toml` `site_url` after checkout; GoTrue still needs a stack restart to load that file).

## Nameservers and DNS

Domain `etkan.org` uses Namecheap (`dns1.registrar-servers.com` / `dns2.registrar-servers.com`). Records that must stay **A → 178.16.129.124** (DNS only / grey cloud if Cloudflare is ever in front):

`@`, `www`, `staging`, `api`, `prod-api`

Leave Mailtrap / Zoho / DKIM / `python` CNAMEs alone unless that product changes.

TTL is about **1 hour**. Different resolvers update at different times. How to see which app a visitor got:

| Header | Meaning |
| --- | --- |
| `via: 1.1 Caddy` and no `x-vercel-id` | This VPS |
| `server: Vercel` / `x-vercel-id` | Still Vercel |

## Rules for later DevOps

1. Do **not** point both Next apps at the same `NEXT_PUBLIC_SUPABASE_URL`.
2. Do **not** run a second `npx supabase start` inside `~/etkan_ms` for prod — ports collide. Prod DB stays in `~/etkan_supabase_prod`.
3. Do **not** `docker compose down` the proxy while changing one app.
4. Rebuild the Next image after changing any `NEXT_PUBLIC_*` (baked at `docker build`).
5. Official Supabase Docker is still the long-term target. Today both DBs are **CLI stacks** (`npx supabase start`), not the official compose project.
6. Cloud (`*.supabase.co`) and Vercel still exist. Cloud data was **not** migrated. Delete those only after DNS and login are verified on this VPS.
