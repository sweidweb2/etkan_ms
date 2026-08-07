# [02] Slow actions, services & post-save refresh

**Where it shows up:** All panels — strongest on manager/CEO accounting, workshops, income statement / analytics, grades, and any form that saves then “reloads the whole page.”  
**What people notice:** Clicking Save / Delete / Record feels sticky; the top bar or button spinner runs longer than the write itself; after success the screen still pauses before you can keep working.  
**Date noted:** 2026-08-07  
**Related (navigation only):** `[01] slow-navigation-and-top-loader.md` — that plan makes **page switches** faster. This plan makes **mutations** (actions + services + refresh after save) faster.

---

## In plain words — what is going wrong?

When you save a payment, edit a workshop, or delete a row, you expect:

1. **The write to finish quickly** — validate → save → done.
2. **The UI to update quickly** — list/detail shows the new truth without a long second wait.

Today both can feel slow, and for different reasons than slow navigation.

### Feeling A — “Save itself feels heavy”

Before the database even writes your change, the server often does a **fixed startup tax** on almost every action:

1. Who is the actor? (session user + display name)  
2. Open admin Supabase client  
3. Load role + permission keys again and check one key  
4. Load related rows (SPP, phase, workshop, …)  
5. Write the change  
6. Extra domain work (recalculate balances, sync status, …)  
7. Write an audit log (awaited)  
8. Mark several routes stale (`revalidatePath` × 2–3)

Only step 5 is “the save.” Steps 1–4 and 6–8 add up on every click.

### Feeling B — “After success it still feels stuck”

Even when the write succeeded, the client often calls **`router.refresh()`** while the server already called **`revalidatePath`**. That can mean a **second full reload** of an expensive page (SPP detail, workshop detail, accounting list, income statement).

So people feel: “the button finished, but I still can’t use the page.” What’s wrong is **double refresh + heavy pages**, not only a slow INSERT.

---

## Why this happens (simple picture)

Think of each mutation as **four clocks**:

1. **Door check** — session + permissions (often uncached on the action path).  
2. **Do the work** — service + DB write + optional recalc/audit.  
3. **Invalidate** — `revalidatePath` on list + detail (+ sometimes more).  
4. **Show the truth** — RSC reload and/or `router.refresh()` so the UI matches the DB.

The **top bar** tracks the server action / network wait.  
**You** care when the dialog closes and the table is correct.

Clocks 3+4 often cost as much as clock 2 — especially on accounting and workshops.

---

## Scan evidence (deep pass, 2026-08-07)

Concrete hotspots found in code (not guesses):

### A — Action bootstrap tax (almost every mutation)

| Finding | Evidence | Severity |
|---------|----------|----------|
| Display name not request-cached | `getSessionDisplayName` in `lib/auth/session.ts` is **not** wrapped in React `cache` (unlike `getSessionUser`). `getSessionAuditActor` always pairs user + display name → extra auth/profile work per action. | High |
| Permission check bypasses request cache | Services use `getUnauthorizedError` / `assertPermission` → `getUserPermissions(client, …)` (**uncached**). `getUserPermissionsCached` exists but mutation paths mostly don’t use it. | High |
| Fresh admin client every action | Pattern in panel `actions.ts`: `getSessionAuditActor()` + `createSupabaseAdminClient()` + service call. | Medium |

### B — Over-broad revalidation + double refresh

| Finding | Evidence | Severity |
|---------|----------|----------|
| Accounting revalidate fan-out | `app/(panels)/manager/accounting/actions.ts` — **~45** `revalidatePath` call sites; typical success invalidates **list + phase + SPP** for one payment/adjustment. | High |
| Workshops revalidate fan-out | `app/(panels)/manager/workshops/actions.ts` — **~36** `revalidatePath` sites. | High |
| Client refresh after server revalidate | Widespread `router.refresh()` in success handlers (SPP details, workshops sections, accounting panel, grades, … — **70+** call sites). Stacked on top of action `revalidatePath`. | Critical |
| Expensive pages reloaded whole | After a small SPP payment: refresh reloads spp + payments + adjustment + forms + invites. Income statement / analytics reload **full ledgers** (see below). | High |

### C — Full-table loads in services (`listAll*`)

| Finding | Evidence | Severity |
|---------|----------|----------|
| Income statement | `getIncomeStatementForManager` loads **all** payments, adjustments, transactions then maps in memory. | High |
| Income analytics | `getIncomeStatementAnalyticsForManager` loads all payments/adjustments/transactions **plus** `listAllSpps` + `listPaymentPhases`, then filters by year/month in JS. | High |
| Other unbounded lists | Workshop payments, borrows, instructor schedule slots, instructor capabilities — `listAll*` with order only, no date/id scope. | Medium–High |
| Dashboard aggregation | `getManagerDashboardForManager` pulls large lists then filters in JS for counts (e.g. open borrows). | Medium |
| Multi-assert list pages | Accounting page runs **6** parallel services; each `assertPermission` reloads role grants (uncached) → repeated door checks for one paint. Class/SPP detail pages similar. | High |

These hurt **page loads** and also hurt **post-action refresh** when those routes are revalidated.

### D — Auth Admin email hydration (N lookups)

| Finding | Evidence | Severity |
|---------|----------|----------|
| Students / users lists | `fetchStudentsForManager` / `fetchUsersForManager` — one `getAuthUserById` **per row** (often parallel, still N Admin API calls). | High |
| Class roster sequential | `listClassStudentsForManager` — **sequential** `await getAuthUserById` inside enrollment loop. | High |
| Instructors / sessions / email | Same pattern in instructor mapping, session attendee maps, email recipient resolve. | Medium–High |

Cold list loads and every refresh of those pages pay this tax.

### E — Sequential bulk mutation loops

| Finding | Evidence | Severity |
|---------|----------|----------|
| Class → in progress SPP backfill | `backfillSppsForClassBecomeInProgress` — `for` each student `await ensureSpp…` (+ audits). | High |
| Phase amount change | `recalcNonCancelledSppsForPhase` — batch reads, then **one update await per SPP**. | High |
| Add many students to class | `addStudentsToClassForManager` loops full `addStudentToClass…` (permission + sync each time). | High |
| Grades compute-all | Per-student `computeAndSave…` reloads class student list / grade context repeatedly. | High |

### F — Domain work after the write

| Finding | Evidence | Severity |
|---------|----------|----------|
| Accounting recalc after payment | `createStudentPaymentForManager` awaits `recalcSppAndPhaseStatus` then awaits `recordManagerAuditLog` — correct, but extra round trips on the critical path. | Medium |
| Audit always awaited | `recordManagerAuditLog` is awaited on most mutations; failure is swallowed, but latency is still on the user path. | Medium |
| Heavy multi-service domains | `workshop.service`, `class.service`, `student-financial-adjustment.service`, `payment-phase.service` — large orchestration for single UI clicks. | Medium |
| Workshop detail reload shape | `getWorkshopForManager` refreshes workshop + payments + instructors + **all instructor candidates** + docs + slots + sessions — overkill after a payment-only edit. | High |

Scan detail also logged by [Scan service bottlenecks](953f5319-e605-4fa5-a86c-066ed27861dc) and [Scan action bottlenecks](bf1e0f05-6054-4ad4-90f5-4d91c5869295).

---

## What “fixed” should feel like

- Clicking Save / Delete returns in a time that feels close to “one database write,” not “reload the whole feature.”  
- Dialog closes; table updates; you can immediately do the next row.  
- Top bar / button spinner stops when the mutation is done — not after a second mystery refresh.  
- Same behavior across accounting, workshops, classes, and other panels.  
- Security unchanged: still check permissions; just don’t pay twice for free.

---

## Fix plan — phases

Do these in order. Keep the app usable after each phase. Don’t skip measuring before Phase 2+.

### Phase 0 — Confirm and measure (no big code changes yet)

**Goal:** Agree which actions feel worst and get before timings.

**Steps**

1. Pick 5–8 mutation journeys across roles/features, for example:
   - Record / edit / delete student payment (SPP details)  
   - Create financial adjustment  
   - Add workshop session or payment  
   - Save class grade / compute grades  
   - Create external transaction (income statement)  
   - One CEO path that hits a shared manager mutation page  
2. For each: note time until button spinner ends, time until dialog closes, time until table is usable.  
3. Log whether Network shows **one** `Next-Action` or also a follow-up RSC/`router.refresh` fetch.  
4. Write “before” numbers in the table at the bottom of this file.

**Done when:** Shared journey list + rough before timings.

---

### Phase 1 — Stop double-paying after success (biggest feel win)

**Goal:** One refresh strategy per mutation — not `revalidatePath` **and** full `router.refresh()` when either alone is enough.

**Steps**

1. Inventory success handlers that call `router.refresh()` after actions that already `revalidatePath` the same routes (start: SPP details, workshop sections, accounting panel, grades).  
2. Prefer, in order:
   - **Return the updated row** and patch local state (already done in some workshop flows), or  
   - Rely on `revalidatePath` + `useActionState` / RSC update without a second full refresh, or  
   - Keep `router.refresh()` only when the action does **not** revalidate enough.  
3. Narrow `revalidatePath` to what the open UI needs (e.g. SPP detail only when already on that page — avoid always busting the full accounting list if unused).  
4. Smoke-test: save payment, save adjustment, edit workshop session — dialog close + table update with **one** network wave when possible.

**Done when:** Phase 0 journeys no longer show a redundant full refresh after success; feel clearly snappier.

---

### Phase 2 — Cheap action bootstrap (session + permissions)

**Goal:** Cut the fixed tax on every server action. Overlaps with `[01]` Phase 2 — share work where possible.

**Status (2026-08-07):** Done via `[01]` Phase 2 — `getSessionPack` + `getUserPermissionsCached` on `assertPermission` / `hasPermission*` / `getUnauthorizedError`. Audit log still awaited (step 4 deferred).

**Steps**

1. ~~Wrap `getSessionDisplayName` in React `cache`…~~ → folded into `getSessionPack`.  
2. ~~Route mutation permission checks through `getUserPermissionsCached`.~~  
3. ~~Keep `assertPermission` / `getUnauthorizedError` behavior identical.~~  
4. Optionally defer non-critical audit log off the critical path (queue / fire-and-forget with care) **only** if product accepts eventual audit rows; otherwise keep await but don’t duplicate actor resolution.

**Done when:** A no-op / tiny mutation’s server time drops measurably on Phase 0 journeys; security tests still pass.

---

### Phase 3 — Make services stop loading the whole world

**Goal:** Repository/SQL does the filtering; services stop `listAll*` + filter in JS for hot paths. Cut Auth Admin N+1 on list pages.

**Status (2026-08-07):** Wave 1–3 with `[01]` Phase 3 — income scoped, Auth email batch, dashboard aggregates, instructors defer, schedule details paging, AI slim list, workshop payments aggregates + page. Still open: calendar instructor-slot listAll; optional further listAll trims.

**Steps**

1. ~~**Income statement + analytics (first):** date-scoped queries…~~  
2. Replace or constrain other `listAll*` used on hot manager pages (workshop payments, borrows, schedule slots) with filters or pagination.  
3. Dashboard: prefer count/aggregate queries over “fetch all then `.filter`.”  
4. ~~**Auth emails:** batch/dedupe…~~ (`listAuthEmailsByIds`)  
5. Keep unit tests; add service tests for scoped date filters.  
6. Re-check Phase 0 journeys that land on these pages after save (refresh cost collapses if the page is cheaper).

**Done when:** Income statement / analytics and top list pages no longer pull unbounded tables for a single month/year view; list pages no longer do N Auth Admin calls.

---

### Phase 4 — Domain mutation path (accounting / workshops first)

**Goal:** After bootstrap + refresh are fixed, trim work **inside** hot services.

**Steps**

1. Accounting payments/adjustments: ensure `recalcSppAndPhaseStatus` only loads what that SPP needs (already somewhat scoped — verify no accidental phase-wide reload on simple payment).  
2. Bulk SPP / class enroll: replace sequential `await` loops with batched inserts/updates where safe (`backfillSpps…`, `recalcNonCancelledSpps…`, `addStudentsToClass…`).  
3. Workshops: avoid re-fetching entire workshop graph when only a session/document/payment changed; return patched rows to the client; don’t reload instructor candidates after payment CRUD.  
4. Grades “compute all”: keep as an explicit heavy action; don’t trigger it from lighter saves; show clear progress; avoid reloading full grade context per student.  
5. Parallelize independent reads inside a single service (`Promise.all`) where still sequential.  
6. Roll other domains in waves (students, classes, emailing) with the same quality bar.

**Done when:** Hot mutation journeys feel acceptably fast even on larger demo data; no “known sticky Save” left untracked.

---

### Phase 5 — Polish and guardrails

**Goal:** Lock the pattern so speed doesn’t regress.

**Steps**

1. Re-run Phase 0 journeys; fill “after” timings.  
2. Checklist: save from dialog, delete confirm, inline action — spinner, toast, table update, **no double refresh**.  
3. Team rule (cursor / docs):  
   - Prefer **return row + local patch** or **one** revalidation strategy.  
   - Do not add `router.refresh()` “just in case” after `revalidatePath`.  
   - Do not add new unscoped `listAll*` for panel pages.  
4. Follow-ups for leftover slow pages go under `docs/[13] Problems/` — don’t silently accept them.

**Done when:** Before/after noted, checklist green, conventions written.

---

## Suggested order of work (checklist)

- [ ] **Phase 0** — Mutation journeys + before timings (multi-feature)  
- [ ] **Phase 1** — End double refresh / narrow `revalidatePath`  
- [x] **Phase 2** — Cached session pack + cached permission load on actions (shared with `[01]` Phase 2)  
- [ ] **Phase 3** — Date/id-scoped repositories (Wave 1–3 done; calendar instructor-slot listAll optional leftover)  
- [ ] **Phase 4** — Domain service trim (accounting → workshops → grades → rest)  
- [ ] **Phase 5** — After timings, regression checklist, rules update  

Coordinate with `[01]`: Phases 2 here and Phase 2 there should share one session/permissions design — don’t build two packs.

---

## Out of scope for this problem

- Top bar honesty for **navigation** (see `[01]`)  
- Changing RBAC *who* can do what (only make checks cheaper)  
- Redesigning forms or toast UX  
- Premature micro-optimizations on cold admin scripts  

---

## Before / after notes

| Journey | Feature | Before (click → usable) | After | Notes (1× vs 2× network?) |
|---------|---------|-------------------------|-------|---------------------------|
| _e.g. Record payment on SPP_ | Accounting | _fill in_ | | |
| | | | | |

---

## Related

- Navigation / top loader: `docs/[13] Problems/[01] slow-navigation-and-top-loader.md`  
- Toast + action state: `.cursor/rules/toast.mdc`  
- Form dialogs pending behavior: `.cursor/rules/form-dialogs.mdc`  
- Top loader (also tracks server actions): `.cursor/rules/loaders-panel-top.mdc`  
- Architecture layers: `.cursor/rules/etkan_ms.mdc`  
)
