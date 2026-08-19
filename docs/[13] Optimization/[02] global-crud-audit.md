# Global CRUD audit — fix everywhere

**Project:** Etkan MS  
**Date:** 2026-08-20  
**Scope:** All 47 canonical services + manager `actions.ts` + `components/manager/**` refresh patterns  
**Companion:** `[01] service-optimization-plan.md` (Waves A–F), `[07] Reports/Slowliness/[02] slow-actions-and-services.md`

Waves A–E optimized **service round trips** on planned phases. This audit captures **what still hurts in production** after that pass: N+1 leftovers, page duplicate fetches, unbounded reads, and **double refresh** (121 `revalidatePath` + 85 `router.refresh()`).

---

## Executive summary

| Layer | 🔴 Fix first | 🟠 Fix next | 🟢 Mostly done |
|-------|-------------|-------------|----------------|
| **Service DB** | Mirror overlap N+1, workshop recopy, guest→student chain, compute-all saves | Subject detail dup, grades page dup, classes list student scan, guest event lists | Wave B–D mutations (RPCs, batch enroll, payments, etc.) |
| **Page compose** | `classes/page` loads all students on first paint | Grades pages double-fetch class/roster/exam | Most list pages with cache/defer |
| **Client refresh** | Accounting SPP panel (6×), workshops sections, grade compute returns row+refresh | 13 refresh-only domains, subjects/notifications | Weekly schedule CRUD (optimistic only) |
| **Cross-cut** | — | Awaited audit on every mutation (~+200 ms) | Auth/session/JWKS |

**Counts (manager panel):**

- **121** `revalidatePath(` in 9 action files (accounting 44, workshops 35, guests 21)
- **85** `router.refresh()` in 46 component files
- **~30+** confirmed **double-refresh** flows (both on same mutation)
- **13** **refresh-only** domains (client refresh, zero server revalidate)

---

## How to use this doc

1. Pick a **wave** below (G → J) — each wave is shippable independently.
2. Within a wave, one PR per **domain** or **pattern** (not one mega-PR).
3. After each fix: warm `[NAV op]` or action timing + `vitest` + `tsc`.
4. Mark items **done** in the checklist at the bottom.

---

## Wave G — Cross-cut refresh (highest UX ROI, low risk)

**Goal:** One refresh strategy per mutation. Stop paying for server revalidate **and** full RSC reload.

### G1 — Remove `router.refresh()` where action already `revalidatePath`

| Domain | Action file | Component hot spots | `revalidatePath` |
|--------|-------------|---------------------|------------------|
| Accounting | `accounting/actions.ts` (44) | `spp-details-panel` (6), `payment-phase-details-panel` (3), dialogs | Yes |
| Workshops | `workshops/actions.ts` (35) | documents, instructors, payments, sessions, details, card | Yes |
| Guests | `guests/actions.ts` (21) | `manage-guests`, `guest-details`, `guest-registration-section` | Yes |
| Subjects | `subjects/actions.ts` (5) | `subject-details-panel`, `subject-card`, `manage-subjects-panel` | Yes |
| Projects | `projects/actions.ts` (1) | `manage-projects-panel` delete only | Partial |

**Pattern:** If action returns entity → `setState(result.entity)` and **do not** refresh. If action only revalidates → drop client refresh.

### G2 — Grade compute: use returned `row` / `rows`

| Action | Returns | Fix |
|--------|---------|-----|
| `computeStudentGradeAction` | `row` | Patch table row; remove refresh |
| `computeAllStudentGradesAction` | `rows` | Merge into list; remove refresh |
| `computeStudentGradeAloneAction` | `row` | Patch detail; remove refresh |

Files: `class-student-grades-section.tsx`, `student-class-grade-details-panel.tsx`, `student-compute-alone-section.tsx`.

### G3 — Add `revalidatePath` to refresh-only domains (or keep refresh, not both)

Domains with **zero** `revalidatePath` today but **client refresh** on every save:

| Domain | Actions file |
|--------|--------------|
| Equipments / borrow | `equipments/actions.ts` |
| Students | `students/actions.ts` |
| Users | `users/actions.ts` |
| Semesters (phases UI) | `semesters/actions.ts` |
| Registrations | `registrations/actions.ts` |
| Relationships | `relationships/actions.ts` |
| Gallery | `gallery/actions.ts` |
| Instructors | `instructors/actions.ts` |
| Notifications | `notifications/actions.ts` |
| Schedule (weekly) | `schedule/actions.ts` |
| Emailing / sent | `emailing/actions.ts`, `sent/actions.ts` |

**Pick one strategy per domain:** narrow `revalidatePath` for open route **or** local patch from action state — not full app refresh.

### G4 — Narrow over-broad `revalidatePath`

| Action | Issue | Fix |
|--------|-------|-----|
| `updateSubjectAction` | Always revalidates `MANAGER_CLASSES` | Only when `nb_sessions` changed |
| Accounting payments | Often busts list + phase + SPP | Revalidate only paths visible on current page |

---

## Wave H — Service N+1 & hot mutations (🔴 DB)

### H1 — Workshop mirror overlap (scales with instructors)

**File:** `lib/manager/workshops/mirror-instructor-schedule.ts`

| Function | Problem |
|----------|---------|
| `assertNoOverlapForMirrorInputs` | **1 list query per instructor** |
| `mirrorWorkshopSlotToAllInstructors` | Uses above |
| `updateMirrorsForWorkshopSlot` | **Per-instructor full calendar list** before bulk update |
| `recopyAllMirrorsForWorkshop` | Full delete + reinsert + per-instructor overlap |

**Hit by:** `changeWorkshopStatusForManager`, workshop schedule slot CRUD, add instructor.

**Fix:** Single batch overlap query (user_ids + dow/time window) or Postgres RPC; stop full recopy on routine status changes.

### H2 — `createStudentFromGuestRegistrationForManager`

**File:** `services/guests/guest-create-student.service.ts`

Chains `createStudent` + up to **3 nested guest status calls**, each re-auth + re-find guest + list events.

**Fix:** One transaction; pass guest/application in memory; one batch status write.

### H3 — `computeAllStudentCourseGradesForManager`

**File:** `services/classes/student-course-grade.service.ts`

Context loaded once (Phase 19) but **each student = save + audit** (~2 hops × N).

**Fix:** Batch upsert RPC for computed grades; optional batch audit or Wave I defer.

### H4 — Instructor capabilities delete

**File:** `services/instructors/instructor.service.ts` → `saveInstructorSubjectCapabilities`

**D removed pairs = D sequential DELETEs.**

**Fix:** Single `.in()` / composite filter batch delete.

### H5 — Guest status duplicate checks

**File:** `services/guests/guest.service.ts`

`setGuestStatus*` / `removeGuestStatus*` list **all events** to check duplicates client-side.

**Fix:** `exists` by `(guest_id, status)` or unique constraint + catch conflict.

### H6 — Workshop session count sync

**File:** `services/workshops/workshop.service.ts`

Every session CRUD: **count + update** (+2 hops).

**Fix:** DB trigger on `workshop_sessions` or increment/decrement in same statement.

### H7 — Weekly schedule copy preview duplicate

**File:** `services/schedule/weekly-schedule-slot.service.ts`

`copyLastWeekScheduleForManager` re-runs `buildCopyPreview` inside copy action.

**Fix:** Pass preview from client or cache week bounds in action.

---

## Wave I — Page compose & read dedup (🟠)

### I1 — Subject detail (measured ~1.5s POST, ~900ms GET)

| Issue | Location |
|-------|----------|
| Duplicate `findSubjectById` + double `assertPermission` | `[id]/page.tsx` calls `getSubjectForManager` + `listSubjectClassesForManager` |
| `countClassesBySubjectId` redundant when classes listed | Use `classes.length` |
| `updateSubjectForManager` re-counts classes for response only | Pass through `subject.class_count` from client |

**Fix:** Add `getSubjectDetailForManager` → `{ subject, classes }` single perm, one subject fetch.

### I2 — Class grades pages

| Page | Duplicate |
|------|-----------|
| `classes/[id]/grades/page.tsx` | `getClassForManager` + `listClassStudentGradesForManager` + `getClassFinalExamForManager` |
| `classes/[id]/grades/students/[studentId]/page.tsx` | `getClassForManager` + `getStudentClassGradeDetailForManager` (reloads full roster) |

**Fix:** One `loadClassGradesPageData` / shared loader.

### I3 — Classes list first paint

| Issue | Location |
|-------|----------|
| `listStudentsWithoutInProgressClassForManager` on list page | `classes/page.tsx` — scans all profiles |

**Fix:** Defer to add-student / create-class dialog (same pattern as `getClassCreateDialogDataForManager`).

### I4 — Notifications list

| Issue | Fix |
|-------|-----|
| `listNotificationsForManager` unbounded full table | Server limit/cursor; or cache with tag invalidation |
| Client paginates in memory only | Move pagination to repo |

### I5 — Backup storage export (ops)

| Issue | Fix |
|-------|-----|
| Client ZIP = **N HTTP requests** per image | Server-side ZIP stream or signed batch URL |
| `listStorageImagesForBackup` walks 3 buckets sequentially | Parallel bucket walks if rate limits allow |

---

## Wave J — Audit & batch fan-out (optional / product decision)

### J1 — Deferred `recordManagerAuditLog` (Phase 60) ✅

**Decision:** Defer audit inserts off the mutation critical path using Next.js `after()` when available; fall back to awaited insert in Vitest and other non-Next runtimes.

- Helper: `lib/ops/schedule-after-response.ts` → `scheduleAfterResponse`
- `recordManagerAuditLog` schedules `persistManagerAuditLog` via `after()` and returns immediately (`null`); the insert still runs before the serverless invocation ends.
- Failures log to `console.error` with action/table context — mutations never throw on audit failure.

### J2 — Parallel audit after batch RPCs ✅

Batch success now writes **one summary audit row** per batch operation (details in `metadata`):

- `addStudentsToClassForManager` — enrollments summary on `student_class` keyed by `class_id`
- `changeStudentStatusForManager` — profile update with `removed_classes` / `retained_spps` / `deleted_spps` in metadata
- `backfillSppsForClassBecomeInProgress` — created/reactivated SPP lists in one row
- `onStudentsJoinedClass` — batch payment sync summary (single-student `onStudentJoinedClass` keeps per-row detail)

**Fix applied:** Summary audit row per batch operation instead of N parallel inserts.

---

## Domain status matrix (all services)

Legend: **S** service hops OK · **P** page/refresh problem · **N** N+1 in service · **U** unbounded read

| Domain | Service | Page/refresh | Priority |
|--------|---------|--------------|----------|
| **Accounting** | S (RPCs done) | P 🔴 (44 revalidate + 14 refresh sites) | G1, G4 |
| **Workshops** | N 🔴 (mirror, recopy, session sync) | P 🔴 (35 revalidate + 18 refresh) | H1, H6, G1 |
| **Classes / enroll** | S (Wave B done) | P 🟠 (students section refresh-only) | G3 |
| **Grades** | N 🟠 (compute-all saves) | P 🔴 (row returned + refresh) | G2, H3, I2 |
| **Sessions** | S | — | — |
| **Subjects** | S (orchestration gap) | P 🟠 | I1, G1 |
| **Semesters** | S | P 🟠 (refresh-only) | G3 |
| **Students** | S | P 🟠 (refresh-only) | G3 |
| **Guests** | N 🟠 (events list, create-student chain) | P 🟠 | H2, H5, G1 |
| **Registrations** | S | P 🟠 | G3 |
| **Instructors** | N 🟠 (capability deletes) | P 🟠 | H4, G3 |
| **Instructor schedules** | N 🔴 (mirror) | OK (optimistic) | H1 |
| **Weekly schedule** | S | OK (optimistic); copy dup | H7 |
| **Schedule assistant** | S | — | — |
| **Equipment / borrow** | S (Phase 46) | P 🟠 (refresh-only) | G3 |
| **Email** | S (batch persist) | Partial | — |
| **Notifications** | S | P + U 🟠 | G3, I4 |
| **Relationships** | S (cached list) | P 🟠 | G3 |
| **Public / gallery** | S | P 🟠 | G3 |
| **Users** | S (Phase 49) | P 🟠 | G3 |
| **RBAC** | S | OK | — |
| **Backup** | S (parallel 50 tables) | P 🟠 (storage N+1 on export) | I5 |
| **Income statement** | S | OK | — |
| **Auth leftovers** | S (skip) | — | — |
| **Ops / cron / AI** | S | Manual refresh button | — |
| **Analytics page** | N/A stub | — | — |

---

## Recommended implementation order

```text
Wave G  Cross-cut refresh (accounting → workshops → grades → subjects → refresh-only domains)
   ↓
Wave H  Service N+1 (mirror → guest-student → compute-all → capabilities → guest exists)
   ↓
Wave I  Page dedup (subjects detail → grades pages → classes list → notifications cap)
   ↓
Wave J  Audit defer + batch audit (product decision)
```

**First 5 PRs (if starting now):**

1. **G1 accounting** — remove 6× refresh from `spp-details-panel.tsx`
2. **G1 workshops** — remove refresh from documents/instructors/payments/sessions sections
3. **I1 subjects** — `getSubjectDetailForManager` + drop redundant update count + G1 refresh fix
4. **H1 mirror** — batch overlap in `mirror-instructor-schedule.ts`
5. **G2 grades** — apply returned `row`/`rows`, drop refresh

---

## Checklist (mark done as you land PRs)

### Wave G — Refresh
- [x] G1 Accounting panels (spp, phase, dialogs)
- [x] G1 Workshops sections (all mutation callbacks)
- [x] G1 Guests panels
- [x] G1 Subjects panels
- [x] G2 Grade compute flows
- [x] G3 Refresh-only domains (pick order: students, users, equipments, notifications, …)
- [x] G4 Narrow revalidatePath (subjects classes path, accounting fan-out)

### Wave H — Service N+1
- [x] H1 Mirror overlap batch
- [x] H1 Stop full recopy on status-only workshop changes
- [x] H2 Guest → student flatten
- [x] H3 Compute-all batch save
- [x] H4 Instructor capability batch delete
- [x] H5 Guest status exists checks
- [x] H6 Workshop session count trigger
- [x] H7 Schedule copy preview reuse

### Wave I — Page reads
- [x] I1 Subject detail bundle
- [x] I2 Class grades page loader
- [x] I3 Classes list defer student scan
- [x] I4 Notifications pagination/limit
- [x] I5 Backup storage ZIP server-side

### Wave J — Audit
- [x] J1 Deferred audit decision + implementation
- [x] J2 Batch audit after batch RPCs

---

## Out of scope (do not reopen)

| Topic | Why |
|-------|-----|
| JWKS / `getClaims` / middleware | Already fast in logs |
| Wave E skipped CRUD services | Service hops OK; UI refresh may still apply (Wave G) |
| Postgres indexes on trivial queries | SQL execution ~0.05 ms |
| `router.refresh` for weekly schedule copy only | No revalidatePath paired — acceptable |

---

## Related docs

- `[01] service-optimization-plan.md` — Waves A–F phase map (service round trips)
- `[07] Reports/Slowliness/[02] slow-actions-and-services.md` — double refresh playbook
- `rule of optimization.md` — priority: >1s → sequential hops → N+1 → 5+ calls → already fast
