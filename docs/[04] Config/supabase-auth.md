# Supabase Auth URLs

Configure Supabase so redirects match `ROUTES.CALLBACK` (`/auth/callback`) in `lib/constants/routes.ts`.

## Environment

| Variable | Dev example | Production |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | `https://your-domain.com` |

The app builds the callback URL as:

```
{NEXT_PUBLIC_SITE_URL}/auth/callback
```

See `getAuthCallbackUrl()` in `lib/config/site.ts`.

## Supabase Dashboard

**Project → Authentication → URL Configuration**

### Site URL

| Environment | Site URL |
| --- | --- |
| Local dev | `http://localhost:3000` |
| Production | `https://your-domain.com` |

Use the value that matches the deployment you are testing. For local work, set Site URL to `http://localhost:3000`.

### Redirect URLs

Add **both** entries (comma-separated or one per line, depending on the UI):

```
http://localhost:3000/auth/callback
https://your-domain.com/auth/callback
```

Replace `https://your-domain.com` with your real production host (e.g. Vercel URL).

Supabase only allows redirects to URLs on this list. The path must be exactly `/auth/callback` — the same as `ROUTES.CALLBACK`.

## Session inactivity timeout

Sessions expire after **15 minutes of inactivity** (no navigation or API refresh). This is enforced in three layers:

| Layer | Location |
| --- | --- |
| Supabase Auth | `[auth.sessions] inactivity_timeout = "15m"` in `supabase/config.toml` (local) |
| Middleware | `middleware.ts` — refreshes session on panel requests; redirects stale cookies to login with `?message=session_expired` |
| Client idle monitor | `components/auth/session-idle-monitor.tsx` in panel shell — signs out after 15 min with no pointer/keyboard/scroll activity |

### Hosted Supabase projects

For production/staging, set the same value in the dashboard:

**Project → Authentication → Sessions → Inactivity timeout = 15 minutes**

Or push config with a recent Supabase CLI (`supabase config push`). Local `config.toml` applies when running `supabase start` only.

The shared app constant is `SESSION_INACTIVITY_MS` in `lib/constants/auth-limits.ts` — keep it aligned with the Supabase setting.

## Code reference

| Piece | Location |
| --- | --- |
| Callback path constant | `lib/constants/routes.ts` → `ROUTES.CALLBACK` |
| Full callback URL helper | `lib/config/site.ts` → `getAuthCallbackUrl()` |
| Route handler (code exchange) | `app/auth/callback/route.ts` |

When starting OAuth or email links from the app, pass `redirectTo: getAuthCallbackUrl()` (or the equivalent option on `signInWithOAuth` / `signUp`).

## Checklist

- [ ] `NEXT_PUBLIC_SITE_URL` set in `.env.local` for dev
- [ ] Production `NEXT_PUBLIC_SITE_URL` set in hosting env vars
- [ ] Supabase Redirect URLs include dev and production callback URLs
- [ ] Supabase Site URL matches the environment you are testing
