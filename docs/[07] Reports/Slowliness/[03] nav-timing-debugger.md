# [03] Nav timing debugger (Phase 0 measure)

**Added:** 2026-08-11  
**Purpose:** Trace every sidebar click → page body so we can see where 1–5s goes.

## How to use

1. Run `npm run dev` (tracer is **ON by default in development**).
2. Open the app, open **browser DevTools → Console**.
3. Also watch the **terminal** where Next is running.
4. Click any panel sidebar link (try light ones first: **Reports**, **Settings**, then **Dashboard**).
5. In the browser console, expand the collapsed group:
   - `[NAV n…_…] /manager/… → XXXXms total`
6. Read the tables:
   - **Client hops** — click → RSC fetch → loading UI → route settled
   - **Middleware breakdown** — `claims`, `maintenance`, `role`, `total`
   - **RSC / session breakdown** — `session_claims`, `session_pack`, `shell_hit`, layouts, `page`

Disable: set `NEXT_PUBLIC_NAV_DEBUG=0` in env and restart.  
Force on in production: `NEXT_PUBLIC_NAV_DEBUG=1`.

## Warm-route protocol (measurement hygiene)

Dev cold compile can dominate the first hit (`next.js` ~1–2s while `page` / `application-code` look tiny). For fair before/after numbers:

1. Navigate to the target route **once** — discard this hit if `next.js` is large (compile spike).
2. Navigate away (e.g. **Reports**), then click back — use the **second** `[NAV]` and matching `GET … application-code` line.
3. Prefer a shell pack **HIT**; if you see **MISS**, record it separately (shared floor, not page query).
4. Do **not** compare a cold-compile Reports trip to a warm heavy page, or treat compile as app data work.
5. After Wave C, sidebar links use `prefetch={false}` — idle open of the shell should not burst RSC for every href; time **click** navigations only.

Paste warm second-hit lines into [`[04] nav-debugger-findings-and-fix-tasks.md`](./[04]%20nav-debugger-findings-and-fix-tasks.md) section 5.

## How to read the bottleneck

| If this is large | Meaning |
|------------------|---------|
| `mw:total` / `mw:claims` ~1s+ | Middleware auth floor (same on every light page) |
| `mw:maintenance` | **Removed from middleware** (2026-08-11 A/B) — check only at login / signup session / auth callback |
| `rsc:session_claims` high | Second getClaims in RSC (duplicate of middleware) |
| `rsc:session_shell_hit = 0` + profile/permissions | Cold session shell (once per ~60s) |
| `rsc:page` high, mw small | That page’s own data fetch |
| Client total high but mw+page small | Dev compile / RSC serialization / network |

**Baseline test:** click **Reports** (almost no page data). If that is still 1–3s, the cost is shared (middleware + shell), not tables.

## Instrumented hops

| Hop | Where |
|-----|--------|
| Click / history | `lib/loaders/bind-global-top-loader.ts` |
| RSC fetch + mw headers | same + `middleware.ts` |
| Session pack | `lib/auth/session.ts` |
| Panels / role / manager layouts | `app/(panels)/layout.tsx`, `role-panel-layout.tsx`, `manager/layout.tsx` |
| Loading UI shown/hidden | `top-loader-pending-bridge.tsx` |
| Route settled | `route-top-loader.tsx` |
| Sample pages | `manager/reports`, `manager/settings`, `manager/dashboard` |

Optional on any page:

```ts
const pageTimer = await startNavPageTimer("my/page");
// ... load data ...
pageTimer.end();
return <>{await navPageTimingBeacon()}{/* ui */}</>;
```

## Related

- `docs/[07] Reports/Slowliness/[01] slow-navigation-and-top-loader.md`
- `docs/[07] Reports/Slowliness/[04] nav-debugger-findings-and-fix-tasks.md`
