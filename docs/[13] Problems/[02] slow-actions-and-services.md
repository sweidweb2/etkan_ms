# [02] Slow actions, services & post-save refresh

**Where it shows up:** All panels — strongest on manager/CEO accounting, workshops, grades, equipment borrow, logs, emailing, and any form that saves then “reloads the whole page.”  
**What people notice:** Clicking Save / Delete / Record feels sticky; the top bar or button spinner runs longer than the write itself; after success the screen still pauses before you can keep working.  
**Date noted:** 2026-08-07  
**Last status pass:** 2026-08-07 (code audit vs this plan)  
**Related:** `[01] slow-navigation-and-top-loader.md` — page **switches** and top bar. This plan — **mutations** (actions + services + refresh after save). They share session/permissions work and heavy `listAll*` pages (those pages hurt both first paint and post-save reload).

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
3. Load role + permission keys and check one key  
4. Load related rows (SPP, phase, workshop, …)  
5. Write the change  
6. Extra domain work (recalculate balances, sync status, …)  
7. Write an audit log (**awaited**)  
8. Mark several routes stale (`revalidatePath` × 2–3)

Only step 5 is “the save.” Steps 1–4 and 6–8 add up on every click.

**Update (Phase 2 done):** steps 1 and 3 are much cheaper now (`getSessionPack` + `getUserPermissionsCached`). Steps 6–8 and the post-save UI reload are still the big feel killers.

### Feeling B — “After success it still feels stuck”

Even when the write succeeded, the client often calls **`router.refresh()`** while the server already called **`revalidatePath`**. That means a **second full reload** of an expensive page (SPP detail, workshop detail, accounting list, grades).

Workshop dialogs often **already receive the new row** from the action but **ignore it** and still call `onCreated()` → `router.refresh()`. So people feel: “the button finished, but I still can’t use the page.” What’s wrong is **double refresh + heavy pages**, not only a slow INSERT.

---

## Why this happens (simple picture)

Think of each mutation as **four clocks**:

1. **Door check** — session + permissions (**cached now** via `getSessionPack` / `getUserPermissionsCached`).  
2. **Do the work** — service + DB write + optional recalc/audit.  
3. **Invalidate** — `revalidatePath` on list + detail (+ sometimes more).  
4. **Show the truth** — RSC reload and/or `router.refresh()` so the UI matches the DB.

The **top bar** tracks the server action / network wait.  
**You** care when the dialog closes and the table is correct.

Clocks 3+4 often cost as much as clock 2 — especially on accounting and workshops. Clock 4 is worse when the page being refreshed still uses unbounded `listAll*` or full graphs.

---

## Status snapshot (2026-08-07)

| Phase | Status | What that means |
|-------|--------|-----------------|
| **0** Measure | **Not done** | Before/after table empty |
| **1** End double refresh | **Not done — #1 leftover** | ~75 `router.refresh()` sites; accounting 44 / workshops 35 `revalidatePath` |
| **2** Session + permissions | **Done** | Shared with `[01]`; audit still awaited (deferred to Phase 4) |
| **3** Stop loading the whole world | **Partial** | Income/analytics scoped; Auth batch on main lists; dashboard aggregates; workshop payments **paged**; AI slimmed; instructor schedules calendar first paint scoped. Still open: borrows, logs, emailing, weekly templates, session Auth N+1, capabilities `listAll` |
| **4** Domain mutation trim | **Not done** | Bulk loops, workshop full-graph reload, grades compute-all, awaited audit |
| **5** Polish / guardrails | **Not done** | |

---

## Remaining bottlenecks (prioritized)

Concrete leftovers after Phase 2 + Phase 3 waves. Fix in this order unless a journey proves otherwise.

### P0 — Critical (every Save / Delete feel)

| # | Problem | Evidence | Doc / fix phase |
|---|---------|----------|-----------------|
| 1 | **Double refresh** — `revalidatePath` **and** `router.refresh()` | ~**75** `router.refresh()` call sites under `components/` (+ app); stacked on accounting/workshops/grades actions | **Phase 1** |
| 2 | **Over-broad revalidate fan-out** | `accounting/actions.ts` **44** `revalidatePath`; `workshops/actions.ts` **35**; typical payment hits list + phase + SPP (or list + payments + detail) | **Phase 1** |
| 3 | **Returned rows ignored** | Workshop add/edit dialogs return rows but UI always `onCreated()` → `router.refresh()`. Grades actions return `row`/`rows` but UI still refreshes. Old claim “some flows already patch” was **wrong**. | **Phase 1** |

### P1 — High (mutation body + expensive reload shape)

| # | Problem | Evidence | Doc / fix phase |
|---|---------|----------|-----------------|
| 4 | **Workshop detail full graph after small CRUD** | `getWorkshopForManager` loads workshop + payments + instructors + **all instructor candidates** + docs + slots + sessions; detail page + refresh reloads all of it | **Phase 4** (+ cheaper page helps `[01]`) |
| 5 | **Sequential bulk mutation loops** | `backfillSppsForClassBecomeInProgress`; `recalcNonCancelledSppsForPhase` (one update await per SPP); `addStudentsToClassForManager` (full add + permission each student); `computeAllStudentCourseGradesForManager` (reloads class students + grade context **per student**) | **Phase 4** |
| 6 | **Audit awaited on critical path** | ~**100+** `await recordManagerAuditLog` in services; errors swallowed but latency stays on the user path | **Phase 4** (optional defer) |
| 7 | **Payment path: recalc then audit sequential** | `createStudentPaymentForManager` awaits `recalcSppAndPhaseStatus` then audit | **Phase 4** |

### P2 — Medium (hurts post-save refresh **and** first paint — share with `[01]`)

These make Save feel stuck because Phase 1’s refresh reloads a fat page. Same work speeds up navigation in `[01]`.

| # | Problem | Evidence | Doc / fix phase |
|---|---------|----------|-----------------|
| 8 | **Instructor schedules calendar `listAll`** | First paint scoped to first instructor; All/workshop via deferred actions | **Fixed (Wave 4 sample)** — All still uses scoped `listAll` on filter change |
| 9 | **Equipment borrow mega load** | `getBorrowPageDataForManager` → `listAllBorrows` + students + equipments + enrollments | **Phase 3 Wave 4** |
| 10 | **Audit logs unbounded + fat columns** | `listAuditLogsForManager` no limit; selects `old_data` / `new_data` | **Phase 3 Wave 4** |
| 11 | **Weekly schedule templates unbounded** | `listWeeklyScheduleSlots` with no range (“All schedules”) | **Phase 3 Wave 4** |
| 12 | **Emailing / sent heavy graphs** | Full users + classes/enrollments/teachers filters; sent list unbounded | **Phase 3 Wave 4** |
| 13 | **Session detail Auth N+1** | `buildStudentDisplayByUserId` / session maps still `getAuthUserById` per student | **Phase 3 Wave 4** |
| 14 | **`listAllInstructorSubjectCapabilities`** | Still used on instructors / schedule-assistant paths | **Phase 3 Wave 4** |
| 15 | **`listAuthEmailsByIds` walks `admin.listUsers` pages** | Batched shape, but cost grows with total auth users — not ID-targeted Admin fetch | **Phase 3 Wave 4** (improve or cache) |
| 16 | **Refresh-only domains** (no `revalidatePath`) | Equipments, schedule, gallery, notifications, instructor-schedules, settings, emailing, sent, cloudflare-ai, semesters — always full `router.refresh()` | **Phase 1** (add narrow revalidate **or** local patch; don’t leave “refresh everything” as default) |
| 17 | **AI usage still up to 500 rows** | Slimmed (no prompt/response) but large first page | Optional trim in **Phase 3** |
| 18 | **Classes list loads create-dialog data on first paint** | Subjects/semesters/teachers/students-without-class for dialog | Defer on open — **Phase 3** / coordinate `[01]` |
| 19 | **Fresh admin client every action** | `createSupabaseAdminClient()` per action — medium fixed cost | Accept unless profiling says otherwise |

### Already fixed — do not re-chase

- Session/permissions bootstrap on mutations (**Phase 2**)  
- Income statement / analytics **date-scoped** repos (**Phase 3**)  
- Workshop **payments overview** aggregates + **server paging** (doc previously listed `listAll` as open — **stale**)  
- Students / users / class roster Auth batch via `listAuthEmailsByIds` (**Phase 3**)  
- Dashboard count/aggregate helpers (**Phase 3**)  
- Instructors page: candidates deferred to dialog open (**Phase 3**)  
- Instructor schedules calendar first paint scoped to first instructor; workshops soft-gated (**Wave 4 sample**)

### Cross-cut with `[01]` (not owned here, but worsens every wait)

| Problem | Why it matters for this doc | Where to fix |
|---------|----------------------------|--------------|
| Middleware every request (`getUser` + maintenance + role) | Floor cost on action RSC / refresh too | **Improved** — middleware uses `getClaims` + parallel/cached maintenance + JWT role when present (`[01]`) |
| Top bar honesty for **navigation** | Separate from Save spinner | `[01]` Phase 1 (done) |
| In-page Suspense not bridged to top bar | After Save, section spinners may outlive the bar | `[01]` residual — optional |

---

## Scan evidence (original deep pass + 2026-08-07 verify)

### A — Action bootstrap tax

| Finding | Original | Now |
|---------|----------|-----|
| Display name / actor resolution | Uncached `getSessionDisplayName` | **Fixed** — `getSessionPack` |
| Permission check uncached | `getUserPermissions(client, …)` on assert | **Fixed** — `getUserPermissionsCached` |
| Fresh admin client every action | Same pattern | **Still true** (medium) |

### B — Over-broad revalidation + double refresh (**still critical**)

| Finding | Evidence | Severity |
|---------|----------|----------|
| Accounting revalidate fan-out | `app/(panels)/manager/accounting/actions.ts` — **44** sites | High |
| Workshops revalidate fan-out | `app/(panels)/manager/workshops/actions.ts` — **35** sites | High |
| Client refresh after server revalidate | ~**75** `router.refresh()` sites; SPP details, workshop sections, accounting, grades, … | **Critical** |
| Returned payload ignored | Workshop/grades UI patches not wired | **Critical** |
| Refresh-only modules | Equipments, schedule, gallery, notifications, … | Medium |

### C — Full-table loads (`listAll*`) — updated

| Finding | Now |
|---------|-----|
| Income statement / analytics | **Fixed** — date-scoped |
| Workshop payments overview | **Fixed** — aggregates + paging |
| Dashboard aggregation | **Fixed** — counts/aggregates |
| Instructor schedules **calendar** | **Fixed (sample)** — first paint `listByRecord` (first instructor); All/workshop deferred |
| Instructor schedules **details** | **Fixed** — paged |
| Borrows | **Still open** — `listAllBorrows` |
| Weekly schedule templates | **Still open** |
| Logs / emailing / sent | **Still open** — unbounded or full graphs |
| Instructor capabilities | **Still open** — `listAllInstructorSubjectCapabilities` |

### D — Auth Admin email hydration — updated

| Finding | Now |
|---------|-----|
| Students / users / class roster | **Batched** via `listAuthEmailsByIds` |
| Session attendee / display maps | **Still N× `getAuthUserById`** |
| `listAuthEmailsByIds` implementation | Still walks paginated `admin.listUsers` until IDs found |

### E — Sequential bulk mutation loops (**still open**)

| Finding | Evidence | Severity |
|---------|----------|----------|
| Class → in progress SPP backfill | `backfillSppsForClassBecomeInProgress` | High |
| Phase amount change | `recalcNonCancelledSppsForPhase` — one update await per SPP | High |
| Add many students to class | `addStudentsToClassForManager` loops full add | High |
| Grades compute-all | Per-student reload of class students + grade context | High |

### F — Domain work after the write (**still open**)

| Finding | Evidence | Severity |
|---------|----------|----------|
| Accounting recalc + audit sequential | `createStudentPaymentForManager` | Medium |
| Audit always awaited | ~100+ service awaits | Medium–High |
| Workshop detail reload shape | `getWorkshopForManager` full graph | High |

---

## What “fixed” should feel like

- Clicking Save / Delete returns in a time that feels close to “one database write,” not “reload the whole feature.”  
- Dialog closes; table updates; you can immediately do the next row.  
- Top bar / button spinner stops when the mutation is done — not after a second mystery refresh.  
- When the action returns a row, the UI patches that row — no full page reload “just in case.”  
- Pages that get refreshed after save are **cheap enough** that one refresh (if still needed) does not freeze the panel.  
- Same behavior across accounting, workshops, classes, and other panels.  
- Security unchanged: still check permissions; just don’t pay twice for free.

---

## Fix plan — phases (adjusted)

Do these in order. Keep the app usable after each phase. Don’t skip measuring before large Phase 4 waves.

### Phase 0 — Confirm and measure (no big code changes yet)

**Goal:** Agree which actions feel worst and get before timings.

**Status:** Not done.

**Steps**

1. Pick 5–8 mutation journeys across roles/features, for example:
   - Record / edit / delete student payment (SPP details)  
   - Create financial adjustment  
   - Add workshop session or payment  
   - Save class grade / compute grades  
   - Create external transaction (income statement)  
   - One CEO path on a shared manager mutation page  
   - Optional: borrow equipment save; send/resend email  
2. For each: note time until button spinner ends, time until dialog closes, time until table is usable.  
3. In Network: count **one** `Next-Action` vs follow-up RSC / `router.refresh` fetch.  
4. Write “before” numbers in the table at the bottom of this file.

**Done when:** Shared journey list + rough before timings.

---

### Phase 1 — Stop double-paying after success (biggest feel win — do next)

**Goal:** One refresh strategy per mutation — not `revalidatePath` **and** full `router.refresh()` when either alone is enough. Wire returned rows into local UI.

**Status:** Not done — **highest remaining priority**.

**Steps**

1. Inventory success handlers with `router.refresh()` after actions that already `revalidatePath` (start: SPP details, workshop sections, accounting panel, grades).  
2. Prefer, in order:
   - **Return the updated row** and **patch local state** (workshop/grades already return data in many actions — **use it**), or  
   - Rely on `revalidatePath` + `useActionState` / RSC update without a second full refresh, or  
   - Keep `router.refresh()` only when the action does **not** revalidate enough.  
3. Narrow `revalidatePath` to what the open UI needs (e.g. SPP detail only when on that page — avoid always busting full accounting list). Target: cut needless fan-out on accounting (44) and workshops (35).  
4. **Refresh-only domains** (equipments, schedule, gallery, notifications, instructor-schedules, emailing, …): either add **narrow** `revalidatePath` for the open route **or** local patch — stop defaulting to full refresh with no server invalidate strategy.  
5. Smoke-test: save payment, save adjustment, edit workshop session, save grade — dialog close + table update with **one** network wave when possible.

**Done when:** Phase 0 journeys no longer show a redundant full refresh after success; workshop/grades returned rows are applied in UI; feel clearly snappier.

---

### Phase 2 — Cheap action bootstrap (session + permissions)

**Goal:** Cut the fixed tax on every server action. Shared with `[01]` Phase 2.

**Status:** **Done** (2026-08-07) — `getSessionPack` + `getUserPermissionsCached` on `assertPermission` / `hasPermission*` / `getUnauthorizedError`. Audit deferral moved to Phase 4.

**Steps**

1. ~~Wrap display name / actor in request cache…~~ → `getSessionPack`.  
2. ~~Route mutation permission checks through `getUserPermissionsCached`.~~  
3. ~~Keep `assertPermission` / `getUnauthorizedError` behavior identical.~~  
4. ~~Optional audit defer~~ → **Phase 4**.

**Done when:** ✅ Security tests still pass; bootstrap no longer the main Save cost.

---

### Phase 3 — Make services stop loading the whole world

**Goal:** Repository/SQL filters; no `listAll*` + filter in JS on hot paths. Finish Auth N+1 leftovers. Makes **post-save refresh** and **`[01]` navigation** cheaper.

**Status:** Waves 1–3 largely done for income, dashboard, workshop payments, main Auth batch, instructors candidates. **Wave 4 required** for leftovers below.

**Steps (done)**

1. ~~Income statement + analytics date-scoped queries.~~  
2. ~~Dashboard count/aggregate queries.~~  
3. ~~Auth emails batch on students/users/class roster (`listAuthEmailsByIds`).~~  
4. ~~Workshop payments overview aggregates + server paging.~~  
5. ~~Instructors candidates deferred; schedule **details** paged; AI list slimmed.~~  

**Steps (Wave 4 — still open; do with or right after Phase 1)**

1. ~~**Instructor schedules calendar:** replace `listAllInstructorScheduleSlots` with range/paging (or load visible window only); don’t pull all workshops/instructors if soft-gated tabs don’t need them on first paint.~~ **Done (sample):** first instructor scoped + soft-gate workshops; All still listAll on demand with locked-workshop SQL exclude.  
2. **Borrow page:** page/filter borrows; defer students/equipments/enrollments needed only for dialogs.  
3. **Logs:** server page + default omit or lazy-load `old_data` / `new_data`.  
4. **Weekly schedule:** scope or page `listWeeklyScheduleSlots` templates.  
5. **Emailing / sent:** stop loading full user/enrollment graphs for filters on first paint; page sent list.  
6. **Session detail:** batch Auth emails (`listAuthEmailsByIds` or better ID-targeted API) instead of per-id `getAuthUserById`.  
7. Constrain `listAllInstructorSubjectCapabilities` (by instructor ids / page).  
8. Improve or cache `listAuthEmailsByIds` so it does not walk all `admin.listUsers` pages as auth user count grows.  
9. Optional: lower AI usage default page size; defer classes create-dialog datasets to dialog open.  
10. Re-check Phase 0 journeys that refresh these pages after save.

**Done when:** Hot list/detail pages used after Save no longer pull unbounded tables; session detail has no Auth N+1; Wave 4 pages listed above addressed or tracked as accepted risk with a follow-up note.

---

### Phase 4 — Domain mutation path (accounting / workshops / grades)

**Goal:** After bootstrap + refresh strategy are fixed, trim work **inside** hot services.

**Status:** Not done.

**Steps**

1. Accounting payments/adjustments: ensure `recalcSppAndPhaseStatus` only loads what that SPP needs (no accidental phase-wide reload on simple payment).  
2. Bulk SPP / class enroll: replace sequential `await` loops with batched inserts/updates where safe (`backfillSpps…`, `recalcNonCancelledSpps…`, `addStudentsToClass…` — one permission check per batch).  
3. Workshops: slim `getWorkshopForManager` (or add a light “after payment” loader); don’t reload instructor candidates after payment/session/doc CRUD; return patched rows and rely on Phase 1 UI patch.  
4. Grades “compute all”: keep as an explicit heavy action; show progress; **load class students + grade context once**, then compute per student — do not reload context every iteration.  
5. Audit log: optionally defer off the critical path (queue / `waitUntil` / fire-and-forget with care) **only** if product accepts eventual audit rows; otherwise keep await but never duplicate actor resolution.  
6. Parallelize independent reads inside a single service (`Promise.all`) where still sequential (payment create: recalc vs non-dependent reads).  
7. Roll other domains in waves (students, classes, emailing) with the same quality bar.

**Done when:** Hot mutation journeys feel acceptably fast on larger demo data; no “known sticky Save” left untracked.

---

### Phase 5 — Polish and guardrails

**Goal:** Lock the pattern so speed doesn’t regress.

**Status:** Not done.

**Steps**

1. Re-run Phase 0 journeys; fill “after” timings.  
2. Checklist: save from dialog, delete confirm, inline action — spinner, toast, table update, **no double refresh**, Network shows one wave when expected.  
3. Team rule (cursor / docs):  
   - Prefer **return row + local patch** or **one** revalidation strategy.  
   - Do not add `router.refresh()` “just in case” after `revalidatePath`.  
   - Do not add new unscoped `listAll*` for panel pages.  
   - New manager actions must document invalidate strategy (local patch / revalidatePath / refresh) in the PR.  
4. Sync leftover page-load items with `[01]` checklist so navigation and post-save don’t diverge.  
5. Follow-ups for leftover slow pages go under `docs/[13] Problems/` — don’t silently accept them.

**Done when:** Before/after noted, checklist green, conventions written.

---

## Suggested order of work (checklist)

- [ ] **Phase 0** — Mutation journeys + before timings (multi-feature)  
- [ ] **Phase 1** — End double refresh / narrow `revalidatePath` / wire returned rows / refresh-only domains  
- [x] **Phase 2** — Cached session pack + cached permission load on actions (shared with `[01]`)  
- [ ] **Phase 3** — Waves 1–3 done; **Wave 4** leftovers (borrow, logs, weekly templates, emailing/sent, session Auth N+1, capabilities, Auth email walk); instructor schedules calendar sample done  
- [ ] **Phase 4** — Domain service trim (accounting → workshops → grades bulk/audit → rest)  
- [ ] **Phase 5** — After timings, regression checklist, rules update  

**Recommended next coding order:** Phase 1 → Phase 3 Wave 4 (pages that refresh after Save) → Phase 4 → Phase 0/5 timings wrap-up (or do a light Phase 0 first if you need numbers for PRs).

Coordinate with `[01]`: one session/permissions design; Wave 4 page trims help both docs.

---

## Out of scope for this problem

- Top bar honesty for **navigation** (see `[01]`)  
- Middleware auth/maintenance floor as a dedicated project (see `[01]`; mention only as cross-cut)  
- Changing RBAC *who* can do what (only make checks cheaper)  
- Redesigning forms or toast UX  
- Premature micro-optimizations on cold admin scripts  
- Re-doing income/analytics scoping or workshop-payments paging (already done)

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
