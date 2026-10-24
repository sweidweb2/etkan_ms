# Five-assumption server performance audit

**Date:** 2026-10-24  
**Scope:** Next.js app (`app/`, `lib/`, `services/`, `repositories/`), Docker/VPS deploy, Supabase access patterns.  
**Source assumptions:** Common Next.js performance thread (cold starts + DB pools, fetch waterfalls, heavy Node CPU, accidental dynamic rendering, server code in client bundles).  
**Goal:** Map each assumption to this codebase — found / partial / not found — with evidence and recommended fixes.

### Severity legend

| Level | Meaning |
|-------|---------|
| **high** | Can freeze or starve the Node process under real concurrent use |
| **medium** | Measurable latency stacking; worsens with traffic or page complexity |
| **low** | Architectural smell or future leak risk; not the current bottleneck |

---

## Hosting context (answers the thread’s closing questions)

| Question | Answer for Etkan MS |
|----------|---------------------|
| Hosting | **Docker on VPS** — `Dockerfile` → `output: "standalone"` → `node server.js`. Compose files under repo root (`compose.prod.yaml`, `compose.staging.yaml`, …). Docs: `docs/[14] Deploy/`. |
| Database access from Next | **Supabase JS over HTTP** (PostgREST / Auth / Storage). No Prisma, no app `DATABASE_URL`, no `pg` usage in app code. |
| When slowness shows | Most relevant to **authenticated panel RSC navigations** and **upload / backup actions**, not classic serverless cold-start pool thrash. |

---

## Scorecard

| # | Assumption | Verdict | Priority |
|---|------------|---------|----------|
| 1 | Serverless cold starts & DB connection pool exhaustion | **Mostly not found** | Low |
| 2 | Cascading server network waterfalls | **Addressed** (hot paths, 2026-10-24) | Medium |
| 3 | Heavy server work blocking Node | **Found** | High |
| 4 | Accidentally opting into dynamic rendering | **Addressed** (2026-10-24) | Low |
| 5 | Massive bundles from server code leaking to client | **Addressed** (2026-10-24) | Medium |

---

## 1. Serverless cold starts & database bottlenecks

### Thread claim

Serverless spins cold containers; each request opens a new Postgres connection and exhausts the pool. Fix: connection pooler (Prisma Accelerate / Neon / Supabase pooler) or long-running servers.

### In this app

| Check | Result |
|-------|--------|
| Serverless (Vercel/Lambda) | **No** — long-lived Node in Docker |
| Direct Postgres from Next | **No** — Supabase HTTP clients only |
| Pooler port 6543 / Prisma Accelerate | **N/A** for the web app |
| Admin client lifecycle | `createSupabaseAdminClient()` creates a **new HTTP client per call** (`lib/supabase/admin.ts`) — not a Postgres socket pool |

### Verdict

**Mostly not found.** The thread’s primary failure mode does not match this architecture. Optional hygiene: process-scoped admin client singleton on VPS (still never expose to the browser).

### Recommended actions

1. Keep talking to Kong/API URL (`NEXT_PUBLIC_SUPABASE_URL`), not raw Postgres from Next.
2. If first-hit-after-idle is slow, inspect Docker/proxy/Supabase stack wake — not Next connection pooling.
3. Optional: cache one admin `createClient` on `globalThis` for the Node process.

**Detailed cold-start / first-hop report (JWKS, `session_pack`, live log examples):**  
[`../Slowliness/[05] cold-start-and-first-hop-bottlenecks.md`](../Slowliness/[05]%20cold-start-and-first-hop-bottlenecks.md)

---

## 2. Cascading network waterfalls on the server

### Thread claim

Sequential `await` in RSC/layouts makes TTFB = sum of all fetches. Fix: `Promise.all`, Suspense streaming.

### In this app

**Already good**

- Session shell: `Promise.all([profile, permissions])` when JWT carries role — `lib/auth/session.ts`
- Hot class detail pages fan out with `Promise.all` (manager / teacher)
- Session pack is React `cache()`’d — layout → page does not fully re-fetch
- Some analytics sections use deferred Suspense streaming

### Mitigation applied (2026-10-24)

1. **`assertPermissions`** — one grants load + all-of check (`services/auth/authorization.service.ts`); used on teacher/student class detail + grade bundle paths instead of sequential `assertPermission`.
2. **Manager settings** — `Promise.all` for server client + session, then maintenance + reset-authz; password-reset user list still depends on authz.
3. **Equipment detail** — equipment row + borrows load in parallel (404 after).
4. **Student class detail** — enrollment via joined-classes list (drops a separate membership round-trip).

### Still sequential (by dependency — leave alone)

- Student detail academic bundles need `joinedClasses` first
- Registration breadcrumb needs application detail first
- Task grade summary needs task ids before student-task rows

### Verdict after fix

**Addressed on the flagged independent stacks.** Remaining waterfalls are data-dependent, not accidental sequential awaits.

---

## 3. Server-side heavy lifting blocking the main thread

### Thread claim

Node is single-threaded. Sharp, ZIP, crypto, large transforms on the request path freeze the event loop for everyone. Fix: workers / job queues.

### In this app

| Work | Path | Risk |
|------|------|------|
| Sharp gallery WebP (up to 15 MB) | `lib/manager/gallery/optimize-image.ts` ← gallery actions | High under concurrent uploads |
| Sharp class cover (`effort: 6`) | `lib/manager/classes/optimize-class-cover.ts` ← class lifecycle | Medium–high |
| Sharp metadata sniff | `lib/manager/student-tasks/inspect-upload-bytes.ts` | Medium (lighter) |
| JSZip DB CSV backup | `lib/export/backup-serialize.ts` ← `app/api/manager/backup` | High |
| JSZip storage backup | `services/backup/backup-storage.service.ts` | High (`generateAsync`; downloads already capped at 3) |
| Large server action bodies | `next.config.ts` `bodySizeLimit: "20mb"` | Amplifies memory pressure |
| Cron | Supabase `pg_cron` (outside Next) | Good separation |
| Job queue (BullMQ / Inngest) | **None** | — |

Client-side jspdf/jszip for certificates / password-reset XLSX runs in the **browser**, not on the Next event loop.

### Verdict

**Found — highest real match** for this deployment model.

### Mitigation applied (2026-10-24)

Without changing UX (still synchronous dialogs/downloads):

1. Process-global async semaphore for Sharp work (`lib/concurrency/heavy-cpu.ts` → `runWithSharpLimit`).
2. `sharp.concurrency(1)` so libvips does not spawn unbounded threads inside one process.
3. Separate process-global limit for backup ZIP `generateAsync` (`runWithBackupZipLimit`).
4. Wired into gallery optimize, class-cover optimize, task-upload image sniff, DB backup CSV zip, storage backup zip.

**Deferred (larger UX/infra change):** background worker + poll/email for full backups; skipping authoritative server Sharp when client already compressed.

### Recommended follow-ups

1. Cap concurrent gallery uploads in the UI if managers batch many images.
2. If backup grows further, move ZIP build to a one-off script / worker and keep the API as a job trigger.
3. Keep certificate PDF/ZIP generation on the client.

---

## 4. Accidentally opting into dynamic rendering

### Thread claim

Reading `cookies()` / `headers()` / `searchParams` high in the tree disables static caching for the whole app. Fix: isolate dynamic APIs to the routes that need them.

### In this app

| Area | Behavior |
|------|----------|
| Root layout | No `cookies()` / `headers()` — does **not** dynamize the whole tree |
| Public marketing | `force-static` + `revalidate = 600` — `app/(public)/layout.tsx`; SSR locale = `DEFAULT_LOCALE` |
| Auth / life / token | Child `force-dynamic` under the static public shell |
| Panels | Explicit `force-dynamic` + session `cookies()` — intentional |

### Mitigation applied (2026-10-24)

1. **Blogs HTTP cache** — `/blogs` and `/blogs/:path*` added to `next.config.ts` marketing `Cache-Control` (same `s-maxage=600` as other ISR pages).
2. **Auth loading isolation** — `app/(public)/auth/loading.tsx` no longer calls `getPublicLocale()` / `cookies()` (loaders stay fetch-free; label uses `DEFAULT_LOCALE`).
3. **Blog slug warm path** — `generateStaticParams` on `blogs/[slug]` from published posts (safe empty fallback via `loadPublicCachedData`).
4. **Dead static params removed** from `/life/[id]` (parent is admin `force-dynamic`).
5. **Guardrails documented** on public layout, auth/life layouts, panels layout, and `getPublicLocale()` — marketing must not import locale cookies.

### Intentional dynamic (do not “fix”)

- Panels / manager `headers()` for `x-pathname` RBAC
- Auth login `searchParams` + locale cookies for first paint
- `/life` `requireAdmin()`, guest/financial token pages

### Verdict after fix

**Addressed** for accidental/static-path hygiene. Remaining dynamic segments are deliberate. Not the whole-app accidental-dynamic failure mode from the thread.

### Follow-ups

1. Never add `cookies()` / `headers()` / `getPublicLocale()` to `app/layout.tsx` or `app/(public)/layout.tsx`.
2. Keep new marketing pages free of session clients; use admin + `unstable_cache` like blogs/gallery/projects.

---

## 5. Massive bundles from server code leaking to client

### Thread claim

Importing DB clients / Sharp / PDF libs into Client Components balloons the browser bundle. Fix: `server-only` boundaries.

### In this app (before 2026-10-24 fix)

| Check | Result |
|-------|--------|
| `server-only` on admin / mail / turnstile / some actions | **Yes** |
| `server-only` on most `repositories/` and `services/` | **No** |
| Client → Sharp / `@/lib/supabase/admin` | **Not found** |
| Client → repository **value** import | **Yes** — notifications Realtime via `notification.repository` |
| Client → jspdf / jszip (static) | **Yes** — grades / certificates / password-reset XLSX |

### Mitigation applied (2026-10-24)

1. **Realtime extracted** to `lib/supabase/notification-realtime.ts` (client-safe). Shared row type in `types/notification-record.ts`.
2. **DTOs moved** off server modules for client panels: `AuditLogCursor`, `EmailingClassOption`, `EmailDeliveryStatus`, `ComputedStudentGradeSheetBundle` live under `types/`.
3. **Dynamic `import()`** for heavy exporters on click/success: grade certificates ZIP, grade-sheet PDF/DOC, password-reset XLSX.
4. **`import "server-only"`** on all `repositories/**` and `services/**` (non-test), plus lib helpers that value-import them (`session`, cover/mirror/resolve/prefetch helpers).
5. **Seed / smoke scripts** use `tsx --conditions=react-server` so `server-only` resolves to the empty server export outside Next.

### Verdict after fix

**Addressed** for the known leak paths. Remaining export weight loads only when the user triggers export.

### Follow-ups

1. Keep new client UI on `types/` + actions — never value-import `services/` / `repositories/`.
2. Prefer dynamic `import()` for any new heavy client-only libs (PDF/ZIP).

---

## Where pain likely shows

1. **Panel navigations** — session + permission stacking + remaining sequential awaits (#2), not serverless pool thrash (#1).
2. **Gallery / class cover / task upload / backup** — Sharp + ZIP on the Next process (#3); mitigated with process limits above.
3. **Manager pages with certificate/ZIP UI** — client bundle weight (#5).

---

## Related docs

- Broader backlog mapped to the 100-prompt skill: [`performance-findings.md`](./performance-findings.md)
- Nav / top-loader slowness: `docs/[07] Reports/Slowliness/`
- Deploy topology: `docs/[14] Deploy/`
