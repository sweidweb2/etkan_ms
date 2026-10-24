# Cold start and first-hop bottlenecks

**Date:** 2026-10-24  
**Scope:** Authenticated panel navigations, middleware, session/JWKS caches, Docker/VPS vs local `npm run dev`.  
**Goal:** Separate *classic serverless cold start* from what Etkan MS actually experiences, with evidence, log examples, and suggested fixes.  
**Related:** [`[01] five-assumption-server-performance-audit.md`](../performance%20audit/[01]%20five-assumption-server-performance-audit.md), [`[03] nav-timing-debugger.md`](./[03]%20nav-timing-debugger.md), [`[04] nav-debugger-findings-and-fix-tasks.md`](./[04]%20nav-debugger-findings-and-fix-tasks.md), `docs/[07] Reports/claims/`.

---

## Executive verdict

| Claim | Verdict |
|-------|---------|
| Serverless Lambda cold start + Postgres pool exhaustion | **Not our model** — Docker/VPS, Supabase over HTTP |
| Cold-start-*like* first-hop cost in this app | **Found** — JWKS MISS, `session_pack` MISS, idle REST, dev compile |
| What often feels slow after the process is warm | **Page `application-code`**, not auth/JWKS |

Production on VPS builds the image (`npm run build`) and runs `node server.js` (standalone). That is the fast path — **not** `npm run dev`. Local `npm run dev` is slower (compile-on-demand, nav debug on by default).

---

## What “cold start” means here

| Class | Meaning | When it hits |
|-------|---------|--------------|
| **A — Process cold** | Empty process caches; first HTTP to Auth/JWKS/Supabase after deploy, restart, idle recycle, or HMR | First authenticated hop after Node starts |
| **B — Session cold** | Per-user shell (role, displayName, permissions) not in process memory | First panel hop after login, TTL expiry, RBAC/logout bust, or different Node process than login |
| **C — Every request** | Cookie client + JWT verify + panel RSC data | Every panel navigation (unavoidable floor) |

Classic “new Postgres connection per Lambda invocation” does **not** apply: Next talks to Kong/PostgREST/Auth/Storage over HTTP (`NEXT_PUBLIC_SUPABASE_URL`), with no Prisma/`DATABASE_URL`/`pg` in the app.

---

## How to measure

| Tool | Enable | What to look for |
|------|--------|------------------|
| Nav timing | Default **ON** in `next dev`; prod: `NEXT_PUBLIC_NAV_DEBUG=1` | `[NAV …] middleware`, `session_pack HIT\|WAIT\|MISS`, page marks |
| Claims detail | Same flag | `claims_detail … jwks=HIT\|MISS:Nms verify=…` |
| Login | Same flag | `[NAV login] login signIn=… shell=…` |

Suspect thresholds (`lib/debug/nav-timing.ts`): middleware ≥400ms, `session_pack` ≥200ms, `session_claims` ≥150ms, page ≥300ms.

### Quick protocol

1. Restart the Node process (or redeploy).
2. Log in → first panel click → note `jwks=MISS` / `session_pack MISS`.
3. Same page again → expect `jwks=HIT`, `session_pack HIT`, lower `pack=`.
4. If HIT but `GET … application-code` still ~1s → profile **page data**, not auth cold start.
5. In **dev**, discard the first compile of a route (`next.js: …ms`); measure the second click.

---

## Ranked bottlenecks

### 1. JWKS HTTP on process cold — ~300–350ms (measured 319ms) — Type A

**Evidence**

```1:10:lib/auth/jwks-cache.ts
/**
 * Process-global JWKS cache for getClaims().
 *
 * Supabase keeps JWKS per client instance / bundle, so middleware and RSC
 * each HTTP-fetch jwks.json on the first authenticated hop (~300–350ms × 2).
 * This store lives on globalThis so login, middleware, and RSC share one
 * fetch in the same Node process.
```

- TTL: `JWKS_CACHE_TTL_MS = 10 * 60 * 1000` (10 minutes).
- Log shape: `claims_detail … jwks=MISS:319ms` vs `jwks=HIT` (`docs/[07] Reports/claims/claims-2.md`).
- Warm path: `warmJwks()` at login (parallel with permissions) in `services/auth/auth.service.ts`; `getClaimsWithSharedJwks` injects cached keys.
- Cold when: process start / deploy / idle recycle; TTL expiry; HMR clearing module/`globalThis` state in dev.

**Already done**

- Process-global JWKS on `globalThis`
- Login warm
- Middleware and RSC share the same cache (must not each HTTP-fetch `jwks.json`)

**Suggested fixes**

1. Keep `warmJwks` + shared cache (do not regress).
2. Optional: warm JWKS once at Node boot (`instrumentation.ts`) so the first cookie session after deploy is cheaper even without a fresh login in that process.
3. Accept occasional re-fetch every ~10 minutes.
4. Do not replace `getClaims` with `getUser` or skip per-request verify (see `.cursor/rules/session-auth.mdc`).

---

### 2. `session_pack` MISS — ~0.7–1.2s (spikes ~1.9s) — Type B (also A after deploy)

**Evidence**

- Logs: `session_pack MISS` with `client=`, `claims=`, `profile=`, `permissions=`, `pack=` (`lib/auth/session.ts`).
- Documented dumps: pack **~733–1215ms**; extreme `pack=1889ms` with profile/permissions ~**1291ms** in parallel (`[04]`, `claims-2.md`).
- Shell TTL in code: `SESSION_SHELL_TTL_MS = 300_000` (**5 min**, sliding on HIT) — `lib/auth/session-shell-cache.ts`.
- Role grants TTL: `ROLE_PERMISSIONS_TTL_MS = 900_000` (15 min); DB miss hundreds of ms, cache hit ~0ms.
- Login warms shell: `setCachedSessionShell` after parallel permissions + `warmJwks` — intended so the first panel hop is a **HIT**.

**HIT after warm (typical)**

```text
session_pack HIT client=29ms claims=7ms pack=37ms
middleware … total=8–9ms
```

**WAIT:** another request is already building the shell (singleflight) — not a cache hit.

**MISS still happens when**

- Shell TTL expired / sliding cliff after idle
- Logout or RBAC bust cleared the shell
- JWT claims role mismatches cached role
- Login warmed process A, next hop hit process B (multi-replica without sticky sessions)
- Direct cookie session after deploy with empty process memory

**Already done**

- Login `setCachedSessionShell`
- Parallel profile ∥ permissions on MISS when JWT carries role
- Singleflight (`WAIT`)
- 5 min sliding shell + 15 min role-permissions cache

**Suggested fixes**

1. Keep login warm + sliding TTL.
2. On multi-container VPS: sticky sessions to the same Node process, or accept one MISS per process/user after deploy.
3. Bust shells only on real identity/RBAC changes (already the pattern).
4. If `session_pack HIT` but `pack=` is hundreds of ms, investigate `client=` (cookie/Supabase client), not the shell map.

---

### 3. Warm session but slow page — `application-code` ~0.5–1.4s — Type C (often the perceived “cold”)

**Evidence (local `npm run dev`, warm JWKS + HIT shell, 2026-10-24)**

```text
jwks=HIT
session_pack HIT client=29ms claims=7ms pack=37ms
middleware … total=8–9ms

GET /manager/students 200 in 1528ms  (application-code: 1417ms)
GET /teacher/settings 200 in 1206ms  (application-code: 1159ms)
GET /manager/students 200 in 1351ms  (next.js: 191ms, application-code: 997ms)
```

Auth/session is **not** the dominant slice once warm. Panel RSC data work is.

**Suggested fixes**

1. Profile those routes with `[NAV op]` / `createNavStepTimer` step logs.
2. Parallelize independent fetches (`Promise.all`); keep Suspense for heavy secondary panels.
3. Prefer measuring **`npm run build` + `npm start`** (or Docker) for “is prod slow?” — not `npm run dev`.
4. Do not keep optimizing JWKS/middleware when logs already show HIT and single-digit middleware ms.

---

### 4. Dev route compile — `next.js` ~200ms–2s — Type A (dev-only)

**Evidence**

- Live: `next.js: 191ms` … `288ms` on some hops.
- Docs: first hit to a heavy route can show `next.js` ~**1960ms** while page data is 0ms (`[04]`).

**Suggested fixes**

- Measure the second navigation to the same route.
- Ignore compile cost when judging VPS/prod.
- VPS must use the production image (`Dockerfile` → `node server.js`), never `npm run dev`.

---

### 5. Idle Supabase / stack wake — ~200–250ms per REST hop — Type A

**Evidence**

- Optimization notes: idle Supabase REST ~**200–250ms**; warm often ~**3–17ms** (`docs/[13] Optimization/`, related CMDs).
- Session MISS and page queries stack these RTTs when the API stack is cold.

**Suggested fixes**

1. On “first hit after idle,” inspect Docker / reverse proxy / self-hosted Supabase wake — not Next connection pooling.
2. Keep the app on Kong/API URL; do not open raw Postgres pools from Next.
3. Reduce sequential page RTTs so a cold stack hurts less.

---

### 6. Middleware first authenticated hop vs marketing — Type A + C

**Evidence**

- Panels / life / auth gates call `resolveMiddlewareAuth` → `getClaims` (`middleware.ts` `needsSessionGate`).
- Warm: middleware often **~2–10ms**, sometimes higher under load; claims **~2–5ms** with `jwks=HIT`.
- Marketing skips session gate when `!needsSessionGate`, but still constructs the Supabase middleware client first (see performance-findings H1).

**Suggested fixes**

1. Optional: early-return **before** creating the middleware Supabase client on pure marketing paths.
2. Keep JWT-role short-circuit (`role=0ms` when claims carry role).
3. Do not re-open claims optimization unless new scans show regression.

---

### 7. Login action cold path — Type B

**Evidence**

- One measured session: login action ~**2.3s**, POST much longer (`claims-2.md`).
- Work: `signInWithPassword` + profile + permissions ∥ `warmJwks` + maintenance check + `setCachedSessionShell`.

**Suggested fixes**

1. Keep permissions ∥ JWKS parallel (done).
2. Avoid blocking login on nonessential work.
3. Expect login to be slower than a warm sidebar hop; optimize the **post-login first panel** via shell warm.

---

### 8. Supabase client creation — Type C (usually low)

| Client | Behavior | Note |
|--------|----------|------|
| `createSupabaseAdminClient()` | New HTTP client per call | Cheap vs REST RTT; optional process singleton on VPS |
| `createSupabaseServerComponentClient()` | Per RSC via `cookies()` | Timed as `session_client` / `client=` |
| Middleware client | Per matched request | Before gate on marketing today |

**Suggested fixes:** optional process-scoped admin singleton; only profile `client=` if HIT packs are hundreds of ms.

---

### 9. Docker / Sharp / no boot instrumentation — Type A (narrow)

| Item | Evidence |
|------|----------|
| Deploy | `Dockerfile`: `npm run build` → `CMD ["node", "server.js"]` |
| No `instrumentation.ts` | No automatic JWKS warm at process start |
| Sharp | First use on upload/optimize paths (`lib/concurrency/heavy-cpu.ts`); not every panel nav |
| Process restart | Clears JWKS + session shell + role-permissions → next user pays A+B |

**Suggested fixes:** optional boot warm for JWKS (and maybe common role permission keys); keep Sharp off the navigation path (already).

---

### 10. Always-dynamic panels — Type C

- `app/(panels)/layout.tsx`: `force-dynamic`
- `next.config.ts`: `experimental.staleTimes.dynamic: 0`

Every panel click refetches RSC. That amplifies perception of slowness but is **not** process cold start. Sidebar links use `prefetch={false}` unless intentional.

---

## Deploy vs local (why `npm start` feels faster)

| Environment | Command | Behavior |
|-------------|---------|----------|
| **VPS / Docker** | Image build + `node server.js` | Production bundle, no per-route compile |
| **Local prod-like** | `npm run build` then `npm run start` | Same class as VPS; use this to judge “real” speed |
| **Local daily** | `npm run dev` | Slower: compile-on-demand, Turbopack, nav debug default ON |

**The VPS must not run `npm run dev`.** Compose/Dockerfile production path uses the standalone server.

---

## A / B / C summary

| Class | Approx cost | Primary lever |
|-------|-------------|----------------|
| **A — Process cold** | JWKS ~300–350ms; idle REST ~200–250ms/hop; dev compile ~0.2–2s | Shared JWKS (done); login/`warmJwks` (done); optional boot warm; stack wake; measure 2nd click / prod |
| **B — Session cold** | MISS pack ~0.7–1.2s; HIT pack ~9–45ms typical | Login `setCachedSessionShell` (done); sliding TTL; sticky process or accept one MISS |
| **C — Every request** | Claims warm ~2–5ms; HIT pack ≤~45–60ms; pages dominate | Keep local verify; cut page round-trips; early marketing middleware return |

---

## Decision guide: what to fix next

| Log / observation | Conclusion | Action |
|-------------------|------------|--------|
| `jwks=MISS` on first hop after restart | Process cold | Boot warm optional; confirm login warm |
| `session_pack MISS` then next hop HIT | Session cold working as designed | Ensure login in same process; sticky sessions if multi-replica |
| `jwks=HIT` + `session_pack HIT` but GET ~1s+ | **Page data**, not cold start | Optimize that route’s fetches |
| Slow only in `npm run dev` | Dev overhead | Confirm with `build` + `start` or Docker |
| Slow only first hit after hours idle | Stack wake | Check Supabase/proxy/Docker, not Prisma poolers |

---

## Related code and docs

| Piece | Path |
|-------|------|
| JWKS cache | `lib/auth/jwks-cache.ts` |
| Session shell | `lib/auth/session-shell-cache.ts` |
| Session pack load | `lib/auth/session.ts` |
| Login warm | `services/auth/auth.service.ts` |
| Middleware gate | `middleware.ts` |
| Nav / claims timers | `lib/debug/nav-timing.ts`, `lib/debug/claims-timing.ts` |
| Deploy | `Dockerfile`, `docs/[14] Deploy/` |
| Session rules | `.cursor/rules/session-auth.mdc` |
| Claims dumps | `docs/[07] Reports/claims/` |
| Five-assumption audit | `docs/[07] Reports/performance audit/[01] five-assumption-server-performance-audit.md` |

### Stale docs note

Some older cache inventory / nav docs still mention a **60s** session shell TTL. **Code is 5 minutes** (`SESSION_SHELL_TTL_MS = 300_000`). Prefer the code and this report.
