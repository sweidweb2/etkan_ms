# Supabase Auth URLs

Configure Supabase so redirects match `ROUTES.CALLBACK` (`/auth/callback`) in `lib/constants/routes.ts`.

## Environment

| Variable | Local | Staging | Production |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | `https://staging.etkan.org` | `https://etkan.org` |

The app builds the callback URL as:

```
{NEXT_PUBLIC_SITE_URL}/auth/callback
```

See `getAuthCallbackUrl()` in `lib/config/site.ts`.

## Supabase Dashboard (hosted project)

Do this in the **hosted** project (the one in `.env.hosted` / `.env.staging` / `.env.production`). Local `config.toml` does not update the cloud dashboard. Do **not** run `supabase config push` from this repo — local `site_url` is `127.0.0.1` and would overwrite production.

**Project → Authentication → URL Configuration**

### Site URL

Set the Site URL to production (Auth emails use this as the primary origin):

```
https://etkan.org
```

### Redirect URLs

Add **all** of these (one per line):

```
http://localhost:3000/auth/callback
http://127.0.0.1:3000/auth/callback
https://staging.etkan.org/auth/callback
https://etkan.org/auth/callback
https://www.etkan.org/auth/callback
```

Supabase only allows redirects on this list. The path must be exactly `/auth/callback` — the same as `ROUTES.CALLBACK`.

Staging and production currently share one hosted project, so **both** HTTPS callbacks must be on that same allow-list.

## Local CLI Auth

[`supabase/config.toml`](../../supabase/config.toml) `[auth]` `site_url` and `additional_redirect_urls` apply only to `npx supabase start`. The committed `site_url` stays `http://127.0.0.1:3000` for local CLI. On the VPS, `scripts/vps-patch-supabase-auth.sh` sets `site_url` to `https://staging.etkan.org` (re-applied after each staging deploy checkout). `additional_redirect_urls` includes localhost plus staging/prod callbacks. After changing Auth config, restart the CLI stack (`npx supabase stop` then `npx supabase start`) so GoTrue reloads.

## Session inactivity timeout

Sessions expire after **30 minutes of inactivity** (no navigation or API refresh). This is enforced in three layers:

| Layer | Location |
| --- | --- |
| Supabase Auth | `[auth.sessions] inactivity_timeout = "30m"` in `supabase/config.toml` (local) |
| Middleware | `middleware.ts` — refreshes session on panel requests; redirects stale cookies to login with `?message=session_expired` |
| Client idle monitor | `components/auth/session-idle-monitor.tsx` in panel shell — signs out after 30 min with no pointer/keyboard/scroll activity |

### Hosted Supabase projects

**Project → Authentication → Sessions → Inactivity timeout = 30 minutes**

The shared app constant is `SESSION_INACTIVITY_MS` in `lib/constants/auth-limits.ts` — keep it aligned with the Supabase setting.

## Code reference

| Piece | Location |
| --- | --- |
| Callback path constant | `lib/constants/routes.ts` → `ROUTES.CALLBACK` |
| Full callback URL helper | `lib/config/site.ts` → `getAuthCallbackUrl()` |
| Route handler (code exchange) | `app/auth/callback/route.ts` |

When starting OAuth or email links from the app, pass `redirectTo: getAuthCallbackUrl()` (or the equivalent option on `signInWithOAuth` / `signUp`).

## Checklist

- [ ] `.env.local` uses `http://localhost:3000` for local CLI work
- [ ] `.env.staging` uses `https://staging.etkan.org`
- [ ] `.env.production` uses `https://etkan.org`
- [ ] Hosted Redirect URLs include local, staging, and production callbacks
- [ ] Hosted Site URL is `https://etkan.org`
- [ ] Turnstile hostnames include `staging.etkan.org`, `etkan.org`, and `www.etkan.org`
