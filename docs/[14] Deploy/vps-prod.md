# Production — as-built (Hostinger VPS)

Reference for later DevOps. Production is a **third notebook** relative to Cloud, and a **second notebook** relative to staging: own Next container, own Supabase CLI stack, own API hostname.

Recorded **2026-09-27** after DNS cutover of `@` / `www` to this VPS.

## What is live

| Check | Result |
| --- | --- |
| Site (use this while apex DNS caches) | `https://www.etkan.org` — Caddy → `etkan-prod-web` (`via: 1.1 Caddy`) |
| Site (after resolvers forget Vercel) | `https://etkan.org` — same container |
| API | `https://prod-api.etkan.org` — Caddy → Kong on host port **55321** |
| Auth health | `https://prod-api.etkan.org/auth/v1/health` returns GoTrue JSON |
| App env | `NEXT_PUBLIC_SITE_URL=https://etkan.org` |
| App API env | `NEXT_PUBLIC_SUPABASE_URL=https://prod-api.etkan.org` |
| Database | CLI stack in `/home/deploy/etkan_supabase_prod` (`project_id = etkan_ms_prod`) |
| `auth.users` at cutover | **1** (seeded manager only) |
| Not this database | Staging (`api.etkan.org`), Cloud (`*.supabase.co`) |

The marketing homepage looks like the old Vercel site because it is the **same git app**, not because Cloud was imported.

Vercel can still answer `etkan.org` on resolvers that have not refreshed (see [Cutover and split DNS](#cutover-and-split-dns)). Do not delete the Vercel project until `nslookup etkan.org` **without** `8.8.8.8` is `178.16.129.124` and headers show Caddy.

## How it is constructed

```
Browser
  → DNS @ / www / prod-api  →  178.16.129.124   (when cache is current)
  → etkan-caddy :443
       ├ etkan.org / www.etkan.org  →  127.0.0.1:3000  →  etkan-prod-web
       └ prod-api.etkan.org         →  127.0.0.1:55321 →  Kong (CLI stack etkan_ms_prod)
                                                             └ Postgres :55322
```

**No second git clone for Next.** Prod Next is built from the same `/home/deploy/etkan_ms` as staging. Only the database stack is a second directory (so ports and Docker project names do not collide).

| Piece | Path / name |
| --- | --- |
| Next code + prod env | `/home/deploy/etkan_ms` |
| Prod env (never overwritten by git) | `/home/deploy/etkan_ms/.env.production` |
| Prod CLI copy | `/home/deploy/etkan_supabase_prod/supabase/config.toml` |
| Next image | `Dockerfile` + `compose.yaml` + `compose.prod.yaml` |
| Compose project | `etkan-prod` |
| Host publish | `3000:3000` |
| `extra_hosts` | `host.docker.internal` and `prod-api.etkan.org` → host-gateway |

Other CLI ports were shifted `54xxx` → `55xxx` (API `55321`, DB `55322`, plus studio/shadow/etc.) so they never bind the same sockets as staging.

`.env.production` was created by copying `.env.staging` then replacing:

- `NEXT_PUBLIC_SITE_URL=https://etkan.org`
- `NEXT_PUBLIC_SUPABASE_URL=https://prod-api.etkan.org`
- anon + service_role from `npx supabase status` **in the prod folder**

SaaS keys (Mailtrap, Turnstile, Cloudflare AI) stay the same values as staging.

## DNS (Namecheap)

| Host | Type | Value |
| --- | --- | --- |
| `@` | A | `178.16.129.124` |
| `www` | A | `178.16.129.124` |
| `prod-api` | A | `178.16.129.124` |

SOA default TTL ≈ **3601 seconds**. Google (`8.8.8.8`) often updates before a home router or `1.1.1.1`.

## Auth

Prod `site_url` is **`https://etkan.org`** in `/home/deploy/etkan_supabase_prod/supabase/config.toml` (patched by hand, then `npx supabase stop` / `start` in **that** folder).

Staging deploy’s `vps-patch-supabase-auth.sh` only touches `/home/deploy/etkan_ms/supabase/config.toml`. It does **not** change prod Auth.

Prod deploy (`vps-deploy-prod.sh`) does **not** re-patch prod `site_url`. If someone resets the prod `config.toml` from git, they must patch and restart the prod CLI stack again.

Redirect allow-list must include `https://etkan.org/auth/callback` and `https://www.etkan.org/auth/callback`.

## Deploy

| Trigger | Workflow |
| --- | --- |
| Push to `main` or **workflow_dispatch** | `.github/workflows/deploy-prod.yml` (`environment: production`) |

Flow:

1. Same CI as staging (lint / typecheck / test / `next build` gate).
2. **Build the Docker image in GitHub Actions** and push to GHCR (`ghcr.io/sweidweb2/etkan-ms:prod-<sha>`).
3. SSH, `cd /home/deploy/etkan_ms`, checkout `main`.
4. `bash scripts/vps-deploy-prod.sh` — login to GHCR, **`docker pull`**, restart **only** `etkan-prod-web` (`--no-build`). Health-check `http://127.0.0.1:3000`.
5. Does **not** restart staging Next or either Supabase CLI stack. Prod stays up until the container swap.

Required GitHub secrets (in addition to `VPS_*`):

| Secret | Where | Value |
| --- | --- | --- |
| `PROD_SUPABASE_ANON_KEY` | Environment **production** | Same as `.env.production` `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

PRs to `main` are CI only.

Checkout `-f` overwrites `/home/deploy/etkan_ms/Caddyfile`. The committed Caddyfile must keep **all five** hosts (`staging`, `api`, `prod-api`, `www`, `etkan.org`) or a **prod** deploy can break staging doors and the reverse.

A push to `dev` does **not** rebuild the prod image. It can still change the shared Caddyfile on disk (same clone).

## Cutover and split DNS

Intended order (what we did):

1. Build prod Next + prod CLI DB **before** moving `@` / `www`.
2. Uncomment (then keep) Caddy blocks for `etkan.org` / `www` **on disk**.
3. Change Namecheap A records.
4. Wait until public DNS is `178.16.129.124`.
5. `caddy reload` so Let's Encrypt can issue apex/www certs.
6. Confirm `via: 1.1 Caddy` and no `x-vercel-id`.

**Finding — two apps at once.** After the Namecheap edit:

- Some resolvers (`8.8.8.8`) already had `178.16.129.124`.
- Others (`1.1.1.1`, home router `192.168.10.1`) still had Vercel (`216.198.79.1`) and/or `www` CNAME `*.vercel-dns-017.com`.

Curl from the **VPS** can show Caddy while a laptop still loads Vercel. That is cache, not a second deploy.

**Finding — `ERR_TOO_MANY_REDIRECTS`.** Opposite redirects during the split:

- Vercel (apex still pointing there): `etkan.org` → **308** `https://www.etkan.org/`
- Caddy (www already on VPS): `www` → **301** `https://etkan.org/`

Browser loop. Fix that stayed in the live Caddyfile: **both** `etkan.org` and `www.etkan.org` `reverse_proxy` to `:3000` (no www→apex bounce). After changing redirects, clear site cookies; browsers cache 301/308.

How to verify on a PC:

```powershell
nslookup etkan.org
nslookup www.etkan.org
```

Then F12 → Network → first document → headers (`via: Caddy` vs `x-vercel-id`).

`ipconfig /flushdns` only clears Windows. It does not change the router’s cached Vercel answer.

## Process we actually used (findings)

1. Add `prod-api` DNS + Caddy door **before** the second database (502 + a real cert is OK).
2. `mkdir /home/deploy/etkan_supabase_prod` and copy `supabase/` from the app repo.
3. Set `project_id = etkan_ms_prod` and shift ports to `55xxx`.
4. `cd /home/deploy/etkan_supabase_prod && npx supabase start`.
5. Write `.env.production`, `compose` up `etkan-prod-web`.
6. Seed RBAC + manager on **prod** keys (`.env.local` was pointed at prod briefly, then restored to staging).
7. Patch prod Auth `site_url`, restart **only** the prod CLI folder.
8. Move `@` / `www` A records; reload Caddy after DNS hits the VPS.

Extra findings:

| Symptom | Cause | Fix |
| --- | --- | --- |
| `prod-api` TLS / hairpin | Curling the public name from the VPS itself | `curl --resolve prod-api.etkan.org:443:127.0.0.1` or check Caddy logs for `certificate obtained` |
| Empty-looking “Cloud data” on the homepage | Same Next marketing UI | Count `auth.users` on `supabase_db_etkan_ms_prod` |
| Prod still showing Cloud panel data | Would mean baked `NEXT_PUBLIC_SUPABASE_URL` is still `*.supabase.co` | Print URL from `.env.production` and `docker exec etkan-prod-web printenv NEXT_PUBLIC_SUPABASE_URL` (URLs only) |

## What a prod deploy must not do

- Do not overwrite `.env.production`.
- Do not `supabase stop` in `~/etkan_ms` (that is **staging**).
- Do not rebuild `etkan-staging-web`.
- Do not delete Vercel or Cloud until apex DNS and login are confirmed on Caddy.

## Later DevOps on prod

- **Data:** Cloud was not copied at cutover. Follow [`cloud-to-vps.md`](./cloud-to-vps.md).
- **JWT:** both CLI stacks still use the default demo JWT. Rotate before calling this hardened.
- **Official Supabase Docker:** replace `etkan_supabase_prod` when you leave CLI mode; update `.env.production` + Caddy `prod-api` port + rebuild Next.
- **www vs apex:** you may restore `www` → `etkan.org` **after** every resolver points `@` at the VPS. Doing it during a split recreates the redirect loop.
- **Traefik:** leftover compose under `/docker/traefik` must stay stopped on reboot.
- Turnstile hostnames must include `etkan.org` and `www.etkan.org`.
- Test Auth email (invite / reset) against `https://etkan.org` Site URL.
