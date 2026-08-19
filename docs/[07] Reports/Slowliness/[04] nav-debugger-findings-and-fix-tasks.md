# [04] Nav debugger findings & fix tasks

**Source:** Live `[NAV …]` + `GET … (next.js / proxy.ts / application-code)` logs only  
**Date:** 2026-08-11  
**Scope:** Manager panel navigations measured in that session  
**Rule:** This report stands on the latest debugger dump. It does not inherit conclusions from older Slowliness notes.

---

## 1. What the debugger measured

Each sidebar click is broken into:

| Signal | Meaning |
|--------|---------|
| `[NAV] middleware … claims / total` | Edge auth gate only |
| `[NAV] session_pack HIT/MISS` | Who-am-I pack: claims + (on miss) profile + permissions |
| `[NAV] panels_layout / manager_layout / role_panel_layout` | Shared shell work |
| `[NAV] page …` | Optional page-body timer (when instrumented) |
| `GET path 200 in Xs (next.js / proxy.ts / application-code)` | Next’s own split of the same request |

---

## 2. Ranked problems (from that dump)

| Rank | Problem | Evidence in the dump |
|------|---------|----------------------|
| **P1** | **Page / RSC data work** (`application-code`) | Accounting 0.4–0.9s usual, spikes **2.6s / 3.8s**; gallery **1117ms**; instructors **1665ms**; users **1283ms**; registrations **1503ms**; income analytics **2.9s** |
| **P2** | **`session_pack` MISS** | users: profile **407ms** + permissions **707ms** → pack **1215ms**; other misses pack **733–774ms** |
| **P3** | **Cold route compile** (`next.js`) | `/manager/reports`: page timer **0ms**, but `next.js` **1960ms** / total **2000ms** |
| **P4** | **Duplicate / overlapping requests** | Many concurrent `GET` + `[NAV]` lines for the same path (e.g. accounting bursts) |
| **P5** | **Middleware** | In this dump: usually **2–10ms**, worst **174ms** — **not** the multi-second cause |

---

## 3. Problem map — where it lives & how it is handled today

### P1 — Heavy `application-code` on specific pages

#### P1.1 `/manager/accounting` (spikes 2.6–3.8s)

| | |
|--|--|
| **Where** | `app/(panels)/manager/accounting/page.tsx` → `listPaymentPhasesForManager`; exceptions via `AccountingExceptionsSection` (Suspense) |
| **How handled today** | Phases load first (blocking). Exceptions stream in Suspense but still run **four** scanners that each re-read phases/SPPs/enrollments (same flight, heavy). Billing class lookup is **per-semester** (N queries). |
| **Risk if broken** | Wrong phase list, wrong exception badges, RBAC on accounting views |

**Safe fix direction**

1. Parallelize phase list helpers (SPP counts + billing) where independent.  
2. Batch “in-progress class by semester” into **one** query (kill N+1).  
3. Build **one shared exceptions snapshot** (or RPC) instead of 3–4 full rescans.  
4. Keep `ACCOUNTING_*` asserts; do not drop Suspense — extend it so the phase table paints before exceptions finish.

---

#### P1.2 `/manager/income-statement/analytics` (~2.9s)

| | |
|--|--|
| **Where** | `app/(panels)/manager/income-statement/analytics/page.tsx` → `getIncomeStatementAnalyticsForManager` |
| **How handled today** | **Waterfall:** assert → load available years (3 bound queries) → period lists + **all unpaid SPPs** → then SPP/phase/profile joins. No in-page Suspense. |
| **Risk if broken** | Wrong charts / totals; analytics permission bypass |

**Safe fix direction**

1. Overlap year-bounds with period fetches where safe.  
2. Put unpaid-SPP / heavy tables behind **Suspense** so chrome + first charts paint earlier.  
3. Prefer date-scoped / aggregate queries over “all unpaid then join”.  
4. Keep `ACCOUNTING_INCOME_STATEMENT_ANALYTICS_VIEW` (or current analytics permission) on the service entry.

---

#### P1.3 `/manager/registrations` (~1.5s)

| | |
|--|--|
| **Where** | `app/(panels)/manager/registrations/page.tsx` → `listRegistrationApplicationsForManager` |
| **How handled today** | Up to **500** apps with **full** application columns, then **all** documents for those apps. List UI only needs a thin set of fields; detail page already loads docs. |
| **Risk if broken** | Missing rows/status on list; detail still must show docs |

**Safe fix direction**

1. List query: **slim columns** only (id, names, contact, program, status, created_at, …).  
2. **Do not** load documents on the list path.  
3. Optional `unstable_cache` + tag bust on registration mutations.  
4. Keep `REGISTRATIONS_VIEW`; leave detail route as-is.

---

#### P1.4 `/manager/instructors` (~1.7s) and `/manager/users` (~1.3s)

| | |
|--|--|
| **Where** | `instructors/page.tsx` → `getInstructorsPageForManager`; `users/page.tsx` → `listUsersForManager` |
| **How handled today** | Profiles (+ subjects/capabilities for instructors), then **Auth Admin** email resolution (`listAuthEmailsByIds` — many `getUserById` or `listUsers`). Users already wrap fetch in `unstable_cache`; cold miss still pays Auth Admin. |
| **Risk if broken** | Wrong emails/roles in tables; instructor capability matrix wrong |

**Safe fix direction**

1. Prefer a **denormalized email** (or one batched Auth pass) instead of N Admin calls.  
2. Cache instructor page payload with tags (mirror users pattern); bust on instructor/user writes.  
3. Keep `INSTRUCTORS_VIEW` / `USERS_VIEW` **outside** cached payloads (assert before read).  
4. Do not change who may open the pages.

---

#### P1.5 `/manager/gallery` (~1.1s)

| | |
|--|--|
| **Where** | `gallery/page.tsx` → `listGalleryImagesForManager` → unbounded `listGalleryImages` |
| **How handled today** | Server loads **all** images; client paginates (5/10/25). |
| **Risk if broken** | Missing images; broken gallery mutations |

**Safe fix direction**

1. Server-side **limit/offset** (or cursor) matching UI page size.  
2. Optional short cache + tag on gallery writes.  
3. Keep `GALLERY_VIEW`.

---

### P2 — `session_pack` MISS (0.7–1.2s)

| | |
|--|--|
| **Where** | `lib/auth/session.ts` → `getSessionPack` |
| **MISS path** | `getClaims` → `profiles` by id → (optional student profile) → `getPermissionsForRoleCached` → `role_permissions` via **admin** client |
| **HIT path** | `lib/auth/session-shell-cache.ts` — process Map, **60s TTL**, keyed by `userId`; still runs `getClaims` every request |
| **Who triggers pack** | `(panels)/layout`, `RolePanelLayout`, `manager/layout` + page helpers — React `cache()` dedupes **within one request**, not across navigations |
| **How handled today** | Shell cache skips profile+perms for 60s; permissions have **no** separate cross-request cache; MISS does profile **then** permissions **sequentially** |
| **Risk if broken** | Wrong role/nav/permissions; stale grants after RBAC edit |

**Safe fix direction**

1. **Keep `getClaims` every request** (do not skip identity verify).  
2. Add process-TTL **role → permission keys** cache; bust on RBAC save (same places that `clearCachedSessionShell`).  
3. On MISS, when JWT already has `claimsRole`, **parallelize** `findProfileById` + `getPermissionsForRoleCached(claimsRole)`, then reconcile.  
4. Do not put live permission sets in cookies/JWT without short TTL + bust.  
5. Optional: slightly longer / sliding shell TTL — still bust on logout, RBAC, role/instructor changes.

---

### P3 — Cold compile (`next.js` bucket)

| | |
|--|--|
| **Where** | Dev / Turbopack compiling the route module graph |
| **Evidence** | `/manager/reports`: **page=0ms**, `application-code=34ms`, `next.js=1960ms` |
| **How handled today** | Normal Next behavior; not a data bug |
| **Risk if “fixed” wrongly** | None for prod data — do not confuse with page query work |

**Safe fix direction**

1. Treat as **dev-only** noise when comparing pages.  
2. Warm the route once before measuring.  
3. Do not rewrite reports panel for “2s compile.”

---

### P4 — Overlapping / duplicate RSC work

| | |
|--|--|
| **Where** | `next.config.ts` `experimental.staleTimes.dynamic: 0`; sidebar `Link` prefetch (`panel-collapsible-nav-group.tsx`); loader arms on click + history |
| **How handled today** | Every panel nav **must** refetch RSC. Prefetch can warm or overlap the same href. Layouts share one pack per request (not N packs). |
| **Risk if broken** | Stale panel UI after mutations; missing permission re-check |

**Safe fix direction**

1. Consider `prefetch={false}` on dense sidebar links (or only heavy routes).  
2. Any staleTimes change must stay compatible with RBAC (server still asserts on each fetch).  
3. Prefer tagged `revalidatePath`/`revalidateTag` after mutations over “always dynamic 0” if you later tune cache — test thoroughly.

---

### P5 — Middleware (minor in this dump)

| | |
|--|--|
| **Where** | `middleware.ts` — `getClaims` (+ role when needed) |
| **How handled today** | Auth/route gate only in the measured window |
| **Action** | **No performance task from this dump.** Keep as security boundary. |

---

## 4. Task list (do in this order)

Use checkboxes as the working plan. Each task should leave the app usable and RBAC unchanged.

### Wave A — Shared floor (helps every page)

- [x] **A1.** Process-TTL cache for `role → permission keys`; bust on RBAC save (+ logout if needed).  
- [x] **A2.** Parallelize session_pack MISS when `claimsRole` is present (profile ∥ permissions).  
- [x] **A3.** Re-measure with `[NAV]` on a **light** page (reports, after warm compile) and one heavy page — confirm pack MISS drops.

**Wave A shipped (2026-08-11):**
- `lib/auth/role-permissions-cache.ts` (60s TTL); wired in `authorization.service.ts`; bust in RBAC + logout actions.
- `getSessionPack` MISS: `Promise.all(profile, permissions)` when `claimsRole` set.
- Measure: manager `role_permissions` DB **330–444ms** vs process cache hit **~0.04ms** (135 keys). Live `[NAV]` after deploy: shell HIT pack **22–32ms** typical. Full cold pack MISS still pays profile RTT once; permissions leg no longer stacks on repeat misses within TTL.

### Wave B — Worst `application-code` pages

- [x] **B1. Accounting** — batch billing-class lookup; dedupe exception scanners into one snapshot; keep Suspense.  
- [x] **B2. Income analytics** — collapse waterfall; Suspense for unpaid/heavy tables; keep permission assert.  
- [x] **B3. Registrations** — slim list columns; remove docs from list path.  
- [x] **B4. Instructors / users** — cut Auth Admin email cost (denormalize or batch + cache); keep view permissions outside cache.  
- [x] **B5. Gallery** — server pagination (or bounded select).

**Wave B shipped (2026-08-11):**
- **B1:** `listInProgressClassesForBilling` (one query); `listPaymentPhasesForManager` parallelizes sppCounts ∥ billing; `getAccountingExceptionsSnapshotForManager` replaces 4 scanners in Suspense section.
- **B2:** Summary vs tables split; charts paint first; tables stream under Suspense; unpaid SPPs filter closed/cancelled phases in SQL.
- **B3:** `APPLICATION_LIST_COLUMNS` + no documents on list path.
- **B4:** Instructors `unstable_cache` (tag `manager-instructors`); process TTL `auth-emails-cache` inside `listAuthEmailsByIds`; bust on people/instructor mutations + logout.
- **B5:** Gallery list `.limit(200)`.

### Wave B2 — Fuller scan follow-ups

Measured Wave B pages were the dump P1 set. A fuller code scan also found these rivals:

- [ ] `/manager/equipments/borrow` — all students + all borrows + enrollment matrix  
- [ ] `/manager/emailing`, `/compose`, `/sent` — Auth Admin users list spillover; sent unbounded  
- [x] `/manager/students/[id]` — per-class academic N+1 → **Wave E** batch  
- [x] `/manager/logs` — unbounded audit rows + JSON blobs → **Wave E** bound + slim  
- [ ] `/manager/accounting/phases/[id]` — reloads full phase list (billing batch from B1 helps partially)

Accounting list + income analytics residual (~2s) also addressed in **Wave E** (not a new B2 row).

### Wave E — Money / student / logs / pack TTL (2026-08-11)

- [x] **E1. Session pack** — shell TTL **5 min** + sliding HIT refresh; role-perms TTL **15 min** (asymmetric so shell MISS usually pays profile only). Bust unchanged (logout / RBAC / identity).  
- [x] **E2. Logs** — default list **limit 100**; slim columns (no `old_data`/`new_data`); details via `findAuditLogById`. Filters/stats apply to latest 100.  
- [x] **E3. Student detail** — `listStudentClassAcademicBundlesForManager` (one grades+final-exams assert; student-scoped batch).  
- [x] **E4. Accounting** — SPP counts via status-only select; exceptions snapshot uses `listStudentProfilesExcludingUserIds` (no full student dump).  
- [x] **E5. Income analytics** — summary uses slim amount rows + min/max date aggregates; tables still load full ledgers under Suspense (no money Data Cache).

### Wave C — Request shape (optional, after A/B)

- [x] **C1.** Sidebar prefetch policy for heavy routes.  
- [x] **C2.** Only if needed: revisit `staleTimes.dynamic` with a written RBAC/regression checklist.

**Wave C shipped (2026-08-11):**
- **C1:** All panel sidebar `Link`s use `prefetch={false}` in `PanelNavMenu` (`panel-collapsible-nav-group.tsx`). Click nav still refetches; idle viewport no longer storms RSC for every visible href.
- **C2:** **Keep** `experimental.staleTimes.dynamic: 0` in `next.config.ts`. Evaluated after A/B — raising it is not needed for the measured P4 overlap once sidebar prefetch is off; correctness risk outweighs benefit.

**Why leave `staleTimes.dynamic` at 0**

- Panel routes are auth/RBAC-sensitive; a non-zero client router stale window can show a prior role’s shell/content until a hard refetch.
- Mutations rely on navigation + `dynamic: 0` plus existing `revalidatePath` / `revalidateTag`. Raising staleTime without a full mutation audit risks stale lists after create/update/delete.

**Regression checklist (must pass before any future raise of `staleTimes.dynamic`)**

1. JWT still verified every request; service `assertPermission` still runs on data loads.
2. After RBAC save / role change / logout: next panel nav shows correct permissions (no stale allow).
3. After one mutation per major list (users, instructors, accounting phase, registrations, gallery): list reflects change without a full browser refresh.
4. Shell / role-perm / list tags still bust on logout and identity writes.
5. Warm `[NAV]` comparison: no worse correctness; any latency win documented.

### Wave D — Measurement hygiene

- [x] **D1.** Always warm a route once in dev before timing (ignore first `next.js` compile spike).  
- [x] **D2.** Paste before/after `[NAV]` + `GET` lines into the table below.

**Wave D shipped (2026-08-11):**
- **D1:** Warm-route protocol documented in `[03]` (and summarized below).
- **D2:** Section 5 filled from warm post–Wave A/B terminal samples where available; remaining routes marked for one D1 remeasure pass.

**Warm-route protocol (D1)**

1. Navigate to the target route once — **ignore** the first hit (`next.js` compile spike).
2. Navigate away (e.g. Reports), then back — use the **second** `[NAV]` / `GET` for timing.
3. Prefer shell pack **HIT**; note pack **MISS** separately.
4. Do not compare cold compile (`page=0`, `next.js` ~2s) to `application-code`.

---

## 5. Before / after (fill while fixing)

| Journey | Before (from dump) | After | Notes |
|---------|--------------------|-------|-------|
| Reports (warm) | compile-dominated; page 0ms | use D1: 2nd click only | baseline for shared floor; ignore cold `next.js` |
| Accounting | app-code 0.4–0.9s; spikes 2.6–3.8s; post-B often ~2.0s | E4: slim SPP counts + targeted exception profiles | remeasure warm 2nd click |
| Gallery | app-code ~1117ms | code: list **cap 200** | B5 + C1 |
| Instructors | app-code ~1665ms; pack MISS ~733ms | code: **unstable_cache** + email TTL | B4 + C1 |
| Users | app-code ~1283ms; pack MISS ~1215ms | code: list cache + shared email TTL (~397ms warm) | B4 + C1 |
| Registrations | app-code ~1503ms | code: slim columns, no list docs (~748ms warm) | B3 + C1 |
| Income analytics | app-code ~2.9s; post-B still ~2.2s | E5: slim summary amounts + date aggregates; tables Suspense | remeasure warm 2nd click |
| Student detail | ~1968ms (per-class N+1) | E3: one academic batch | remeasure warm 2nd click |
| Logs | ~1712ms unbounded + JSON | E2: limit 100 + slim list; details by id | filters on latest 100 |
| session_pack MISS | 733–1215ms; post-A dual ~350–700ms | E1: shell **5m** sliding + role-perms **15m** | expect fewer dual misses while hopping |
| session_pack HIT | ~20–116ms | **~9–45ms** typical | claims + shell |
| Sidebar idle prefetch | viewport prefetch stormed heavy hrefs | **`prefetch={false}`** on all panel sidebar Links | C1 |
| staleTimes.dynamic | `0` (always refetch) | **kept `0`** + checklist | C2 |

---

## 6. Guardrails (do not break)

1. **Still verify JWT** (`getClaims` / equivalent) on each request.  
2. **Still assert permissions** in services for the feature being loaded.  
3. **Bust** shell / role-permission caches on logout, RBAC changes, role / instructor identity writes.  
4. **Do not** “fix” cold compile by deleting features from empty pages.  
5. Prefer **streaming / Suspense** and **slimmer queries** over skipping auth.  
6. After each wave: smoke sidebar nav + one mutation on that feature + one RBAC-denied check if applicable.

---

## 7. Quick reference — files to touch

| Area | Primary files |
|------|----------------|
| Session pack / shell | `lib/auth/session.ts`, `lib/auth/session-shell-cache.ts` (**5m** + sliding HIT) |
| Role → permissions TTL | `lib/auth/role-permissions-cache.ts` (**15m**; bust: RBAC + logout) |
| Permissions load | `services/auth/authorization.service.ts`, `repositories/permission.repository.ts` |
| Panel shell callers | `app/(panels)/layout.tsx`, `components/panels/role-panel-layout.tsx`, `app/(panels)/manager/layout.tsx` |
| Accounting | `payment-phase.service.ts` (SPP status counts + exceptions snapshot) |
| Analytics | income-statement analytics service (slim amount rows) |
| Student detail | `listStudentClassAcademicBundlesForManager` + student-scoped repos |
| Logs | audit-log repo/service (limit 100, slim list, details by id) |
| Registrations | `.../registrations/page.tsx`, registration list service/repo |
| Instructors / users | instructors + users pages/services, `listAuthEmailsByIds` |
| Gallery | gallery page + `listGalleryImages` |
| Prefetch / stale | `panel-collapsible-nav-group.tsx` (`prefetch={false}`), `next.config.ts` (`staleTimes.dynamic: 0`) |
| Debugger | `lib/debug/nav-timing.ts`, terminal `[NAV]` lines |

---

## 8. One-sentence summary

**From the latest debugger dump: middleware is fine; the seconds are page data (`application-code`) plus cold `session_pack` misses, with dev compile and overlapping refetches as secondary noise — fix shared pack cache/parallelism first, then the heavy manager list/analytics queries without weakening RBAC.**
