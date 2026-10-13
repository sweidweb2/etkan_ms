# Service round-trip optimization plan

**Project:** Etkan MS  
**Date:** 2026-08-19 (plan) · 2026-08-20 (global audit)  
**Scope:** Every canonical service under `services/<domain>/`  
**Follows:** `docs/[13] Optimization/rule of optimization.md`  
**Global CRUD audit (post–Wave E):** `docs/[13] Optimization/[02] global-crud-audit.md` — refresh patterns, remaining N+1, page dupes, Waves G–J.

This plan is **not** “optimize enroll and maybe the rest later.” It is a **full pass over all domain services**, one cluster at a time.

Related work that is **not** this plan:

| Doc | Owns |
|-----|------|
| `docs/[07] Reports/Slowliness/[01] slow-navigation-and-top-loader.md` | Route switches, top bar |
| `docs/[07] Reports/Slowliness/[02] slow-actions-and-services.md` | `router.refresh` / `revalidatePath` after save |
| `docs/[07] Reports/claims/` | `getClaims` / session shell |

This file owns **service-layer Supabase orchestration**: how many REST/RPC round trips a use case makes, and whether they are sequential.

Canonical import path only: `@/services/<domain>/<name>.service`.  
Do not edit leftover copies at `services/*.service.ts` if they still exist.

---

## 1. How to implement

- **One phase = one implementation pass.** Merge and measure before starting the next.
- **One service, or one function cluster inside a service.** Never “optimize all of `class.service.ts`.”
- Independent reads → `Promise.all` first. Dependent writes → batch query or one PostgreSQL RPC. Duplicate fetches → reuse data already in memory.
- After each phase: unit tests green + before/after timings.

Agent instruction (paste when starting a phase):

> Refactor **only** the function(s) listed in phase N of `docs/[13] Optimization/[01] service-optimization-plan.md`. Do not blindly optimize or change behavior. Identify every DB call, map dependencies, use `Promise.all` only for independent calls, use batch queries for N+1, use a PostgreSQL RPC/transaction when several dependent writes belong together. Do not add indexes unless `EXPLAIN ANALYZE` proves SQL is slow. Do not add caching unless the data is appropriate. Preserve business rules, authorization, RLS, errors, and audit meaning. Measure before/after.

If a phase’s functions already have **&lt; 4 round trips** and **&lt; ~300 ms warm**, mark it **skip** in the checklist and move on. Do not invent work.

---

## 2. Standing rules

1. Services never talk to Supabase. New RPCs live in **repositories**.
2. Preserve authorization, validation, RLS, errors, and audit **meaning**.
3. Do not change product behavior to make a query faster.
4. Do not add indexes “just in case.” Postgres execution is already ~0.05–0.1 ms on trivial queries.
5. Do not reopen `getClaims()` / middleware / JWKS / admin client creation unless a **new** scan proves they are slow again.
6. Do not force dependent steps into `Promise.all`.
7. Idle Supabase REST is ~200–250 ms; warm can be ~3–17 ms. **Count round trips**, not SQL complexity.
8. Grant new `security definer` RPCs to **`service_role` only**.
9. `assertPermission` / `getUnauthorizedError` stay. Do not “save a hop” by skipping auth.

---

## 3. Measurement protocol

Use `[NAV op]` / `createNavStepTimer` where it already exists. Add a timer **only** for the function under that phase if it has no step logs.

Capture **5 logged-in warm runs** (not first compile):

| Field | Before | After |
|-------|--------|-------|
| Step breakdown | | |
| Total function time | | |
| Round-trip count (REST + RPC) | | |
| Same rows / same user-facing errors | | |

Success = **fewer sequential hops**, not one lucky 10 ms sample.

---

## 4. Priority (from the rule)

```text
🔴  >1 second user-facing services
      ↓
🔴  Many sequential Supabase calls
      ↓
🔴  N+1 (loop of queries)
      ↓
🟠  5+ DB calls
      ↓
🟢  Already fast (measure, then skip)
```

Do **not** start at 🟢 CRUD (relationships, gallery rename, notification mark-read) while 🔴 paths still exist.

---

## 5. Already done — do not redo

| Area | Status |
|------|--------|
| Session pack, JWKS, login warmup, permission cache | Done |
| Late-join attendees / tasks / join-payment RPCs | Code in repo. Apply `supabase/migrations/20260827120000_late_join_enrollment_rpcs.sql` on hosted DB before measuring enroll. |
| Class roster + main lists: Auth emails via `listAuthEmailsByIds` | Done |
| Income statement / analytics date-scoped aggregates | Done |
| Workshop payments overview paging | Done |
| Instructor schedules calendar first paint scoped | Partial — All-instructors / workshop filter still wide |
| Instructors page: candidates deferred to dialog | Done |

---

## 6. Complete service catalog

Every canonical `*.service.ts`. Risk is **expected** round-trip smell, not a measured SLA. Update the Status column as phases land (`todo` / `skip` / `done`).

### 6.1 `services/classes/`

| Service | Main clusters | Risk | Why |
|---------|---------------|------|-----|
| `class.service.ts` | list/create/get/update class; status; teachers; sessions list; students list; available students; analytics; final exam CRUD; **add/remove/transfer student** | 🟠 | Create-dialog universes deferred (`getClassCreateDialogDataForManager`); list students batches profiles+emails; enroll mutations still heavier |
| `session.service.ts` | session/task detail; create/update/delete session; create task; attendee/task update; `ensureSessionAttendeesForMembers`; late-join seeds | 🟠 | Session/task detail Auth emails batched via `listAuthEmailsByIds`; member seed still 3 REST hops |
| `student-course-grade.service.ts` | grade/academic detail; bundles; class grades list; compute one; **compute all**; delete | 🟢 | Class graph loaded once (incl. attendees/exam); detail/bundle paths reuse it |
| `semester.service.ts` | list/create/update; progress; connect class | 🟠 | Progress walks classes; connect is sequential |
| `subject.service.ts` | CRUD; subject classes | 🟠 | Delete/update may load related classes/sessions |
| `class-computed-grade-lock.service.ts` | lock asserts | 🟢 skip | 1 hop per assert; batch user-id list |

### 6.2 `services/accounting/`

| Service | Main clusters | Risk | Why |
|---------|---------------|------|-----|
| `accounting-sync.service.ts` | find target phase; ensure SPP; join; leave; **backfill in_progress** | 🟠 | Join/leave/ensure/backfill RPCs landed; apply hosted SQL before measuring |
| `accounting-recalc.service.ts` | recalc one SPP; recalc all on phase; leftover `recalcSingleSpp` / phase-status | 🟠 | `recalcSppAndPhaseStatus` + phase-wide RPC landed; leftover callers still TS |
| `student-payment.service.ts` | SPP detail; list payments; create/update/delete payment; delete SPP | 🟠 | Write RPCs landed; leftover reads still REST. Apply `20260832120000_accounting_write_rpcs.sql` before measuring |
| `student-financial-adjustment.service.ts` | adjustment CRUD; forms; invites; public token submit | 🟠 | Adjustment writes RPC; forms/invites still sequential. Same hosted SQL |
| `payment-phase.service.ts` | list/create/update/cancel phase; SPPs; **repair missing**; **transfer**; exception snapshots | 🟠 | Create/repair/transfer/cancel RPCs landed; list/snapshots still 🔴. Same hosted SQL |
| `transaction.service.ts` | create/update expense/income row | 🟠 | Write + audit; smaller than SPP recalc |
| `income-statement.service.ts` | statement + history months | 🟢 skip | Date-scoped `*Between`; batch SPP/phase/labels |
| `income-statement-analytics.service.ts` | summary + tables | 🟢 skip | Slim amount rows + date bounds; batch joins |

### 6.3 `services/students/`

| Service | Main clusters | Risk | Why |
|---------|---------------|------|-----|
| `student.service.ts` | list; without in-progress class; detail + stats; joined/assignable classes; create; update | 🟠 | Create is Auth + profile + student_profile + maybe enroll; detail stats several queries |
| `student-status.service.ts` | preview side effects; **change status** | 🟠 | Change RPC landed; preview stays read-only. Apply `20260833120000_change_student_status.sql` before measuring |
| `student-semester.service.ts` | semester roster; add student to semester | 🟠 | Sequential class/semester/enrollment |
| `student-registration.service.ts` | public submit; manager list/detail/status; docs | 🟠 | Submit is multi-insert + storage; detail loads docs one-by-one signed URLs |
| `student-activity.service.ts` | activity list; prefetch audit groups | 🟠 | Audit-group prefetch can be wide |

### 6.4 `services/workshops/`

| Service | Main clusters | Risk | Why |
|---------|---------------|------|-----|
| `workshop.service.ts` | list; **getWorkshop first paint**; CRUD workshop; status; instructors; docs; payments; sessions | 🟠 | First paint is workshop + instructors + docs + sessions + payment count; payments/candidates/slots load on tab/dialog |

### 6.5 `services/guests/`

| Service | Main clusters | Risk | Why |
|---------|---------------|------|-----|
| `guest.service.ts` | list; detail; status (single + bulk); CRUD | 🟠 | Detail loads guest + events + registration in parallel; bulk status still loops |
| `guest-registration.service.ts` | invite open/stop; public submit; manager submit; connect user; list users for link | 🟠 | Invite + submit multi-step; user-link list can be heavy |
| `guest-create-student.service.ts` | create student from guest application | 🟠 | Auth user + profile + student + link; sequential |

### 6.6 `services/schedule/`

| Service | Main clusters | Risk | Why |
|---------|---------------|------|-----|
| `instructor-schedule-slot.service.ts` | page; tabs; details; list; CRUD slots; eligible workshops | 🟠 | First paint is first-instructor slots; browse loads by record/entity; eligible workshops already slim |
| `weekly-schedule-slot.service.ts` | list (week range); CRUD; copy last week | 🟠 | List requires a week; copy still loops inserts |
| `schedule-assistant.service.ts` | instructor/subject/capability/slot catalogs | 🟢 | Capability matrix loads capabilities only for the capped instructors on screen |

### 6.7 `services/equipment/`

| Service | Main clusters | Risk | Why |
|---------|---------------|------|-----|
| `borrow-equipment.service.ts` | borrow page (paged history); create options; create/update/toggle | 🟠 | First paint is classes + paged history; students/equipment/enrollments load via options endpoints |
| `equipment.service.ts` | list/get/create/update | 🟢 skip | 3–5 hops; batch borrow sums; no N+1 |

### 6.8 `services/communications/`

| Service | Main clusters | Risk | Why |
|---------|---------------|------|-----|
| `email.service.ts` | send; filter data; sent list/detail; resend | 🟠 | Filter is classes only; class members load on select; sent list pages (50); Auth emails batched |
| `notification.service.ts` | list/create/update/read/delete | 🟢 skip | 2–4 hops; plain CRUD |

### 6.9 `services/instructors/`

| Service | Main clusters | Risk | Why |
|---------|---------------|------|-----|
| `instructor.service.ts` | page; candidates; save capabilities; add/remove | 🟠 | Add loops promote; save capabilities may replace many rows; `listAllInstructorSubjectCapabilities` on some paths |

### 6.10 `services/auth/`

| Service | Main clusters | Risk | Why |
|---------|---------------|------|-----|
| `authorization.service.ts` | permissions / assert | 🟢 skip | React `cache` + role-permission TTL; **do not reopen** |
| `auth.service.ts` | login/logout/register | 🟢 skip | Login parallelizes shell; claims-first session |
| `user.service.ts` | list; create staff; update | 🟠 done | Phase 49: parallel pre-checks |
| `rbac.service.ts` | catalog; update role permissions | 🟢 skip | One list + one replace; lockout check in-memory |
| `profile.service.ts` | username uniqueness helper | 🟢 skip | Cold-path suffix loop only (OAuth username gen) |
| `role.service.ts` | resolve role / instructor flag | 🟢 skip | Claims-first; single slim profile read fallback |
| `user-display.service.ts` | display name | 🟢 skip | Metadata-first; ≤2 DB hops on fallback |

### 6.11 `services/ops/`

| Service | Main clusters | Risk | Why |
|---------|---------------|------|-----|
| `audit-log.service.ts` | list (unbounded + fat columns); get by id; `recordManagerAuditLog` | 🟠 list / 🟢 write-shape | List is a page problem; write is 1 insert (cost is *awaiting it everywhere*) |
| `cron-job.service.ts` | list jobs | 🟢 skip | Constants catalog; perm only |
| `cloudflare-ai-usage.service.ts` | record; list (cap 500) | 🟢 skip | Single insert; bounded list |

### 6.12 `services/public/`

| Service | Main clusters | Risk | Why |
|---------|---------------|------|-----|
| `public-project.service.ts` | list public/manager; CRUD | 🟢 skip | 2–4 DB hops; storage upload out of scope |
| `gallery-image.service.ts` | list; CRUD (URL only) | 🟢 skip | 2–4 hops; no storage upload |

### 6.13 `services/relationships/`

| Service | Main clusters | Risk | Why |
|---------|---------------|------|-----|
| `relationship.service.ts` | list/create/update | 🟢 skip | Cached list; 3–4 hop writes |

### 6.14 `services/backup/`

| Service | Main clusters | Risk | Why |
|---------|---------------|------|-----|
| `backup.service.ts` | export table / full DB | 🟢 skip | Full export: **parallel** 50-table `Promise.all` |
| `backup-storage.service.ts` | list/download storage images | 🟢 skip | 3 buckets sequential; paginated storage list (ops path) |
| `backup-history.service.ts` | record/list history | 🟢 | Skip |

---

## 7. Phase map

Implement **in this order**. Each box is several small phases below.

```text
Wave A   Foundation (migration + how we measure fat services)
Wave B   🔴 write chains  (>1s / sequential / loops)
           classes enroll+session seed
           accounting sync/recalc/payments/phases
           student status
           grades compute-all
Wave C   🔴 N+1 and unbounded reads (pages people open every day)
           workshops detail, borrow, email, grades lists,
           session Auth, guests detail, schedules, audit list
Wave D   🟠 remaining 5+ call mutations (every leftover domain)
Wave E   🟢 measure-and-skip CRUD (auth leftovers, public, relationships, equipment, notifications, backup)
Wave F   Cross-cut: deferred audit (optional, product decision)
```

---

## Wave A — Foundation

### Phase 0 — Apply existing enroll RPCs

Ops only. No service refactor.

Apply `20260827120000_late_join_enrollment_rpcs.sql` on hosted Supabase so later class-enroll timings are real.

**Done when:** those three RPCs exist and are callable as `service_role`.

### Phase 1 — Baseline timers on fat services that have none

**Status: done** (timers landed; capture 5 warm `[NAV op]` runs before Phase 2).

Add `createNavStepTimer` (same helper as class/enroll) to the **entry functions** of:

- `computeAllStudentCourseGradesForManager`
- `createStudentPaymentForManager`
- `changeStudentStatusForManager`
- `getWorkshopForManager`
- `getBorrowPageDataForManager`
- `listEmailingTableFilterDataForManager`
- `getInstructorSchedulesPageForManager`
- `createPaymentPhaseForManager`
- `getStudentForManager` / `getStudentDetailStatsForManager`

Do **not** refactor queries in this phase.

**Done when:** one warm `[NAV op]` line exists for each of those clicks.

---

## Wave B — Proven slow write chains

### Phase 2 — `addStudentToClassForManager`: independent reads

**Status: done**

`services/classes/class.service.ts`

`findClassDetailById` and `findStudentProfileById` are independent → `Promise.all`. Keep `existing` after both succeed.

### Phase 3 — `addStudentToClassForManager`: stop refetching class row

**Status: done**

`mapClassDetailToRow` must not reload the class graph. Reuse `classResult` (adjust member count in memory if needed).

### Phase 4 — Enroll exam grade → 1 RPC

**Status: done** — apply `supabase/migrations/20260828120000_ensure_enrollment_final_exam_grade.sql` on hosted DB before measuring.

Past-due missing + 0 + late note, `ON CONFLICT` on exam-grade unique key. Same rules as today.

### Phase 5 — Enroll insert → 1 RPC

**Status: done** — apply `supabase/migrations/20260829120000_enroll_batch_and_transfer.sql` on hosted DB before measuring.

Replace SELECT-then-INSERT with one insert/`on conflict`. Same “already enrolled” field error.

### Phase 6 — `addStudentsToClassForManager`

**Status: done** — same hosted SQL as Phase 5.

Stop `for` → full `addStudentToClassForManager`. Auth + class once; batch profiles; batch/multi RPCs for enroll + attendees + tasks + payment sync.

### Phase 7 — `removeStudentFromClassForManager` / `transferStudentBetweenClassesForManager`

**Status: done** — same hosted SQL as Phase 5.

Map sequential leave/join (class rows, membership, payment sync). Transfer must not run two full enroll/leave pipelines if one RPC/tx can move the student.

### Phase 8 — `ensureSessionAttendeesForMembers` → 1 RPC

**Status: done** — apply `supabase/migrations/20260830120000_session_attendees_task_seed_and_leave_sync.sql` on hosted DB before measuring.

`services/classes/session.service.ts`  
Insert present attendees for current members, `ON CONFLICT DO NOTHING`. Do not delete historical rows.

### Phase 9 — `createSessionTaskForManager`: seed all members

**Status: done** — same hosted SQL as Phase 8.

If creating a task still loads members then inserts `student_tasks` in extra hops, add `seed_student_tasks_for_new_task(task_id)` RPC.

### Phase 10 — `onStudentLeftClass` → 1 RPC

**Status: done** — same hosted SQL as Phase 8.

`services/accounting/accounting-sync.service.ts`  
Mirror join-sync: one tx, jsonb out, audit in TS if something changed.

### Phase 11 — `ensureSppForStudentOnPhase` / `findSyncTargetPhaseForClass` leftovers

**Status: done** — apply `supabase/migrations/20260831120000_spp_ensure_backfill_and_recalc.sql` on hosted DB before measuring.

Used by phase create, in_progress backfill, repair. Each should become one SQL function (reuse `internal_recalc_*` helpers).

### Phase 12 — `backfillSppsForClassBecomeInProgress`

**Status: done** — same hosted SQL as Phase 11.

Stop per-student `ensureSpp` + per-create audit wait. One SQL function over enrolled students; optional single audit summary or batched audit.

### Phase 13 — `recalcSppAndPhaseStatus` / `recalcNonCancelledSppsForPhase`

**Status: done** — same hosted SQL as Phase 11.

`services/accounting/accounting-recalc.service.ts`  
One RPC that recalculates one SPP + parent phase. Phase-wide recalc is set-based, not `await` per SPP.

### Phase 14 — Student payment write path

**Status: done** — apply `supabase/migrations/20260832120000_accounting_write_rpcs.sql` on hosted DB before measuring.

`createStudentPaymentForManager` / update / delete / `deleteSppForManager`  
Write + recalc in one RPC; audit after.

### Phase 15 — Adjustment write path

**Status: done** — same hosted SQL as Phase 14.

`createAdjustmentForManager` / update / delete — same pattern as payments.

### Phase 16 — `createPaymentPhaseForManager`

**Status: done** — same hosted SQL as Phase 14.

Stop sequential ensure-SPP per enrolled student. One tx: insert phase + seed SPPs + recalc.

### Phase 17 — `repairMissingSppForManager` / `transferStudentPaymentPhaseForManager` / `cancelPaymentPhaseForManager`

**Status: done** — same hosted SQL as Phase 14.

Each is its own pass. Repair = set-based insert; transfer = one tx; cancel = set-based SPP + phase status.

### Phase 18 — `changeStudentStatusForManager`

**Status: done** — apply `supabase/migrations/20260833120000_change_student_status.sql` on hosted DB before measuring.

`services/students/student-status.service.ts`  
Preview can stay read-only and parallel. The change path must not loop `onStudentLeftClass` / per-SPP cancel / per-phase recalc in TS. Prefer one RPC that applies the same rules.

### Phase 19 — `computeAllStudentCourseGradesForManager`

**Status: done**

`services/classes/student-course-grade.service.ts`  
Load grade context **once**. Set-based compute or bounded `Promise.all` over already-loaded rows. Not O(students) × full graph.

---

## Wave C — N+1 and unbounded reads

### Phase 20 — Grade read paths

**Status: done**

`getStudentClassGradeDetailForManager`, `getStudentClassAcademicDetailForManager`, `listStudentClassAcademicBundlesForManager`, `listClassStudentGradesForManager`, `listComputedStudentGradeSheetBundlesForManager`

Independent session/attendee/task/exam loads → `Promise.all`. Bundles must not repeat the class graph per student.

### Phase 21 — `getSessionDetailForManager` / `getSessionTaskDetailForManager`

**Status: done**

Kill leftover `getAuthUserById` per student. Use `listAuthEmailsByIds` (or a tighter Admin fetch if that helper still pages all Auth users).

### Phase 22 — Class read paths

**Status: done**

`getClassForManager`, `listClassStudentsForManager`, `listAvailableStudentsForClass`, `getClassAnalyticsForManager`, `listClassesForManager` (dialog payload)

Parallel independent counts/teachers/semester. Do not load create-dialog universes on first paint of the class list (defer to dialog open **in the service contract**: split `listClasses` vs `getClassCreateDialogData`).

### Phase 23 — `getWorkshopForManager`

**Status: done**

Split first paint: workshop + instructors + counts. Defer **all instructor candidates**, full payments, and slots to the tab/action that needs them. Mutations must call a slim reload, not this full graph.

### Phase 24 — Workshop list / payments overview

**Status: skip** — already paged/aggregated.

`listWorkshopsForManager` is the workshop catalog (same shape as the class list). `getWorkshopPaymentsOverviewForManager` pages (cap 50) and aggregates in parallel. `listAllWorkshopPaymentsForManager` is a page-1 wrapper and is unused on first paint.

### Phase 25 — `getBorrowPageDataForManager`

**Status: done**

Do not load all students + all equipment + all borrows + all enrollments to render the page. Page/filter in repositories; options endpoints for the dialog.

### Phase 26 — Emailing

**Status: done**

`listEmailingTableFilterDataForManager`, `listSentEmailsForManager`, `getSentEmailDetailForManager`, `sendEmailsForManager`

Bound lists. Batch Auth. Do not scan full directory + all enrollments for filters. Recipient loop may stay (external API); DB work must not be N+1.

### Phase 27 — Guest reads

**Status: done** (`listGuestsForManager` skip — already a single list)

`listGuestsForManager`, `getGuestDetailForManager`  
Independent guest/events/registration → `Promise.all` or one view/RPC.

### Phase 28 — Instructor schedules reads

**Status: done** (`listEligibleWorkshopsForInstructorScheduleForManager` skip — already slim cached tabs)

`getInstructorSchedulesPageForManager`, `listInstructorScheduleSlotsPageForManager`, `listEligibleWorkshopsForInstructorScheduleForManager`, `getInstructorScheduleSlotsDetailsForManager`

No unbounded `listAll` on All-instructors / workshop filter. Scope by instructor + date range.

### Phase 29 — `listWeeklyScheduleSlotsForManager`

**Status: done**

Require a week/range. “All templates” must not dump the table.

### Phase 30 — `schedule-assistant.service.ts` catalogs

**Status: done**

`listCapabilityMatrixCatalog` must not `listAllInstructorSubjectCapabilities` unbounded. Filter by the instructors/subjects on screen.

### Phase 31 — `listAuditLogsForManager`

**Status: done**

Limit + cursor. Do not select `old_data` / `new_data` on the list (only on `getAuditLogByIdForManager`).

### Phase 32 — Student reads

**Status: done**

`listStudentsForManager`, `getStudentForManager`, `getStudentDetailStatsForManager`, `listJoinedClassesForStudentManager`, `listAssignableClassesForStudentManager`, `listStudentActivityForManager`

Parallel stats; no N+1 classes; activity prefetch bounded.

### Phase 33 — Accounting exception / list reads

**Status: done**

`listPaymentPhasesForManager`, `listSppsForPhaseForManager`, `getSppDetailForManager`, `getAccountingExceptionsSnapshotForManager`, `listMissingSppForOpenedPhases`, `listSppSemesterMismatchForManager`, `listStudentsBilledWithoutActiveClassForManager`

Snapshots that walk every phase × every enrollment belong in **one SQL** or stay paged. Independent list queries → `Promise.all`.

### Phase 34 — `getInstructorsPageForManager` / `listInstructorCandidatesForManager`

**Status: done**

Confirm candidates stay off first paint. Batch remaining profile/Auth.

### Phase 35 — Semester / subject reads

**Status: done**

`listSemesterProgressForManager`, `listSemesterClassesForManager`, `listSemesterStudentsForManager`, `getSubjectForManager`, `listSubjectClassesForManager`

Progress must not query per class in a loop.

---

## Wave D — Remaining 5+ call mutations

Each phase is one cluster. Same playbook: map calls → parallel reads → batch/RPC writes.

### Phase 36 — Class structure mutations

**Status: done**

`createClassForManager`, `updateClassForManager`, `updateClassStatusForManager` (triggers backfill — depends on Phase 12), `assignTeacherToClassForManager`, `unassignTeacherFromClassForManager`, `createClassSessionForManager`, `createFinalExamForManager`, `updateFinalExamForManager`, `updateStudentFinalExamGradeForManager`

### Phase 37 — Session mutations leftover

**Status: done**

`updateClassSessionForManager`, `deleteClassSessionForManager`, `updateSessionSettingsForManager`, `updateAttendeeForManager`, `updateStudentTaskForManager`

### Phase 38 — Grade mutations leftover

**Status: done**

`computeStudentCourseGradeForManager` (single student), `deleteStudentCourseGradeForManager`

### Phase 39 — Semester / subject mutations

**Status: done**

`createSemesterForManager`, `updateSemesterForManager`, `connectClassToSemesterForManager`, `addStudentToSemesterForManager`, `createSubjectForManager`, `updateSubjectForManager`, `deleteSubjectForManager`

### Phase 40 — Student create/update / registration

**Status: done**

`createStudent`, `updateStudent`, `submitPublicRegistrationApplication`, `updateRegistrationApplicationStatusForManager`, `updateRegistrationApplicationForManager`  
Signed URL loops → batch or parallel with a cap.

### Phase 41 — Workshop mutations (slim reload)

**Status: done**

Every write in `workshop.service.ts` after Phase 23: create/update/status/delete, instructor add/update/remove, document upload/rename/delete, payment CRUD, session CRUD.  
**Done when:** none of them require `getWorkshopForManager`’s candidate list to finish the action.

### Phase 42 — Guest mutations

**Status: done**

`createGuestForManager`, `updateGuestForManager`, `deleteGuestForManager`, `setGuestStatusForManager`, `setGuestStatusesForManager`, `setGuestProfileStatusForManager`, `removeGuestStatusForManager`

Bulk status must not be N × full single-status pipeline.

### Phase 43 — Guest registration / create-student

**Status: done**

`openGuestRegistrationInviteForManager`, `submitGuestRegistrationByToken`, `submitGuestRegistrationForManager`, `connectGuestRegistrationUserForManager`, `createStudentFromGuestRegistrationForManager`, `cancelGuestRegistrationApplicationForManager`, `deleteGuestRegistrationApplicationForManager`

### Phase 44 — Instructor mutations

**Status: done**

`addInstructorsForManager`, `removeInstructorForManager`, `saveInstructorSubjectCapabilities`  
Add-many: one batch promote, not per-id full pipeline if safe.

### Phase 45 — Schedule slot mutations

**Status: done**

`createInstructorScheduleSlotForManager`, `updateInstructorScheduleSlotForManager`, `deleteInstructorScheduleSlotForManager`, `createWeeklyScheduleSlotForManager`, `updateWeeklyScheduleSlotForManager`, `deleteWeeklyScheduleSlotForManager`, `copyLastWeekScheduleForManager`

Copy-last-week: one insert-select, not per-slot REST inserts.

### Phase 46 — Borrow mutations

**Status: done**

`createBorrowsForManager`, `updateBorrowRecordForManager`, `toggleBorrowReturnedForManager`  
Stock checks: batch equipment rows, not per line item if independent.

### Phase 47 — Adjustment forms / invites / public token

**Status: done**

`createFinancialFormForManager` and update/delete; invite create/delete; `submitFinancialFormByToken`  
Joined SPP+phase load (`findSppWithPhaseById`); parallel form/invite + phase reads on update/delete.

### Phase 48 — `createTransactionForManager` / `updateTransactionForManager`

**Status: done**

Write + audit only; no independent lookups to parallelize (verified).

### Phase 49 — `createStaffUser` / `updateManagerUser`

**Status: done**

Auth admin + profile + role; parallel username/email pre-checks and update pre-reads; no extra student-profile re-fetch after create.

### Phase 50 — Email send / resend persistence

**Status: done**

`sendEmailsForManager`, `resendSentEmailForManager`  
Mailtrap sequential per recipient; batch `insertEmailUsers` after send loop (verified + test).

---

## Wave E — Measure-and-skip (🟢)

Run Phase 1-style timings. If already fast, check **skip** and do not refactor.

### Phase 51 — `equipment.service.ts`

**Status: skip**

`listEquipmentsForManager`, `getEquipmentForManager`, `createEquipmentForManager`, `updateEquipmentForManager`

| Function | Round trips (auth + domain + audit) | Notes |
|----------|-------------------------------------|-------|
| `listEquipmentsForManager` | 3 | perm → list → **batch** active-borrow sums by equipment id (no N+1) |
| `getEquipmentForManager` | 3 | perm → find by id → batch borrow sum for one id |
| `createEquipmentForManager` | 3 | perm → insert → audit |
| `updateEquipmentForManager` | 5 | perm → find → borrow check → update → audit (sequential; borrow check depends on id from input, not on find result) |

No loops, no duplicate fetches, no multi-second chains. Borrow quantities already use `listActiveBorrowQuantitiesByEquipmentIds`. **Do not refactor.**

### Phase 52 — `notification.service.ts`

**Status: skip**

Full CRUD + mark read.

| Function | Round trips | Notes |
|----------|-------------|-------|
| `listNotificationsForManager` | 2 | perm → list |
| `createNotificationForManager` | 3 | perm → insert → audit |
| `updateNotificationForManager` | 4 | perm → find → update → audit |
| `markNotificationReadForManager` (single) | 4 | perm → find → mark → audit |
| `markNotificationReadForManager` (mark all) | 3 | perm → bulk mark → audit |
| `deleteNotificationForManager` | 4 | perm → find → delete → audit |

Plain CRUD; no N+1. **Do not refactor.**

### Phase 53 — `relationship.service.ts`

**Status: skip**

List/create/update.

| Function | Round trips | Notes |
|----------|-------------|-------|
| `listRelationshipsForManager` | 2 | perm → **cached** list (`unstable_cache`, tag-invalidated on writes) |
| `createRelationshipForManager` | 3 | perm → insert → audit |
| `updateRelationshipForManager` | 4 | perm → find → update → audit |

List already server-cached; writes are minimal. **Do not refactor.**

### Phase 54 — `public-project.service.ts` / `gallery-image.service.ts`

**Status: skip**

List + CRUD. Storage upload time is out of scope unless there is extra DB chatter.

**`public-project.service.ts`**

| Function | Round trips | Notes |
|----------|-------------|-------|
| `listPublicProjectsForManager` | 2 | perm → list |
| `getPublicProjectForManager` | 2 | perm → find by id |
| `createPublicProjectForManager` | 3 + storage | perm → **storage upload** → insert → audit (storage latency out of scope) |
| `updatePublicProjectForManager` | 4–5 + storage | perm → find → optional storage upload → update → optional old-image remove → audit |
| `deletePublicProjectForManager` | 4 + storage | perm → find → storage remove → delete → audit |

No N+1 DB loops. Image work is Supabase Storage, not REST table chatter. **Do not refactor.**

**`gallery-image.service.ts`**

| Function | Round trips | Notes |
|----------|-------------|-------|
| `listGalleryImagesForManager` | 2 | perm → list |
| `createGalleryImageFromUploadForManager` | 3 | perm → upload → insert `storage_path` → audit |
| `updateGalleryImageForManager` | 4 | perm → find → update → audit |
| `deleteGalleryImageForManager` | 4 | perm → find → delete → audit |

Plain CRUD; no storage, no N+1. **Do not refactor.**

### Phase 55 — `rbac.service.ts` / `class-computed-grade-lock.service.ts`

**Status: skip**

**`rbac.service.ts` — `updateRolePermissionsForManager`**

| Step | Hops | Notes |
|------|------|-------|
| Full path | ~6 | perm → list all role grants (lockout check) → replace (validate keys + delete + batch insert) → audit |

Single replace transaction pattern; no per-permission loop. Catalog helpers are constants-only or one list query. **Do not refactor.**

**`class-computed-grade-lock.service.ts`**

| Function | Hops | Notes |
|----------|-------------|-------|
| `assertClassStructureUnlockedForComputedGrades` | 1 | count by class id |
| `assertStudentGradeInputsUnlockedForComputedGrade` | 1 | find by class + user |
| `getClassComputedGradeLockState` | 1 | list user ids by class (batch) |
| `getClassComputedGradeLockStateForManager` | 2 | perm → above |

Minimal assert reads; no N+1. **Do not refactor.**

### Phase 56 — Income statement verify

**Status: skip**

`getIncomeStatementForManager`, `listIncomeStatementHistoryMonthsForManager`, `getIncomeStatementAnalyticsForManager` (and summary/tables).

**Date scope confirmed:**

| Query pattern | Scoped? | Used in |
|---------------|---------|---------|
| `listPaymentsBetween` / `listPaymentAmountsBetween` | ✅ `gte`/`lt` on `payment_date` | statement, analytics |
| `listFinancialAdjustmentsBetween` / `listFinancialAdjustmentAmountsBetween` | ✅ on `effective_date` | statement, analytics |
| `listTransactionsBetween` / `listTransactionAmountsBetween` | ✅ on `transaction_date` | statement, analytics |
| `sumAllPaymentAmounts` | ❌ all-time (intentional `totalSppPaymentsAmount` stat) | statement only |
| `listAllPaymentDates` / adjustment / transaction date lists | ❌ dates-only scan (history month discovery) | history months |
| `listActiveUnpaidSpps` | ❌ current unpaid roster (intentional for analytics tables) | analytics tables |

**Orchestration:**

| Function | Hops | Notes |
|----------|------|-------|
| `getIncomeStatementForManager` | ~7 | perm → **parallel** 4 period queries → batch SPP ids → batch phases → **parallel** profiles + student profiles |
| `listIncomeStatementHistoryMonthsForManager` | 4 | perm → **parallel** 3 slim date-column lists → in-memory month keys |
| `getIncomeStatementAnalyticsSummaryForManager` | 4–7 | perm → **parallel** year bounds + slim amount rows; optional second parallel fetch if resolved year/month differs |
| `getIncomeStatementAnalyticsTablesForManager` | ~7 | perm → **parallel** 4 (3 date-scoped + unpaid SPPs) → batch SPPs → batch phases → **parallel** labels |
| `getIncomeStatementAnalyticsForManager` | summary + tables | Composes the two above; duplicate period reads are acceptable for split summary/tables contract |

No N+1; batch `listSppsByIds` / `listPaymentPhaseAmountsByIds` / `listProfilesByIds`. **Do not refactor.**

### Phase 57 — Auth leftovers

**Status: skip**

`auth.service.ts`, `profile.service.ts`, `role.service.ts`, `user-display.service.ts`, `authorization.service.ts`

No hot-path domain DB loops (JWKS/session/permissions paths already optimized per standing rules).

| Service | Scan result | Notes |
|---------|-------------|-------|
| `auth.service.ts` | skip | `login`: **parallel** profile + cached permissions + `warmJwks`. `getSessionAuthIdentity`: claims-first, `getUser` fallback only. `register`: fixed sequential signup chain (not a loop). |
| `authorization.service.ts` | skip | React `cache` + process TTL role-permission cache; `rememberUserRole` skips redundant profile read. **Do not reopen.** |
| `role.service.ts` | skip | `resolveUserRoleForMiddleware`: claims role → 0 DB hops. Else one `findRoleById`. `syncAuthUserRole`: single Auth admin update. |
| `user-display.service.ts` | skip | `displayNameFromAuthUser`: no DB. `resolveDisplayName`: metadata first, then ≤2 sequential lookups (student profile → profile username). Session shell uses auth metadata at login. |
| `profile.service.ts` | skip | `ensureStudentRegistration`: fixed 2–4 hop chain. `generateUniqueUsername`: suffix loop (cold OAuth path only; not enroll/panel hot path). |

**Do not refactor.**

### Phase 58 — Ops leftovers

**Status: skip**

`listCronJobsForManager`, `listCloudflareAiUsageForManager`, `recordCloudflareAiUsage`

| Function | Hops | Notes |
|----------|------|-------|
| `listCronJobsForManager` | 1 | perm → in-memory `getManagerCronJobsCatalog()` (no DB list) |
| `listCloudflareAiUsageForManager` | 2 | perm → single list query (`limit: 500`, newest first) |
| `recordCloudflareAiUsage` | 1 | single insert; failures logged, not thrown |

AI list already capped at 500; no N+1. Optional page-size trim deferred — no measured timeout. **Do not refactor.**

### Phase 59 — Backup

**Status: skip**

`exportSingleTableBackup`, `exportFullDatabaseBackup`, `listStorageImagesForBackup`

| Function | Pattern | Notes |
|----------|---------|-------|
| `exportSingleTableBackup` | 1 hop | one `exportTableRows` |
| `exportFullDatabaseBackup` | **parallel** | `Promise.all` over all **50** `BACKUP_TABLES` — not sequential per table |
| `listStorageImagesForBackup` | storage walk | 3 buckets sequential; each bucket paginated (`LIST_PAGE_SIZE = 100`). Supabase Storage API, not REST table N+1 |

No reported export timeout; full DB dump is already parallel and bounded by table count. Storage image listing is inherent bucket walk on an ops path. **Do not refactor.**

---

## Wave F — Cross-cut (optional)

### Phase 60 — Deferred `recordManagerAuditLog` ✅

**Decision:** Defer via Next.js `after()` (see `lib/ops/schedule-after-response.ts`). Mutations return before the audit REST insert; `after()` keeps the invocation alive until the insert completes. Vitest and non-Next runtimes await inline.

**Done when:** written decision (do / don’t). If do, enroll + payment + status-change saves drop the extra hop without losing logs.

---

## 8. Per-phase playbook (every service)

Copy this when starting any phase:

1. List every repository call in the function (auth, reads, writes, audit).
2. Draw depends-on (what needs a previous result).
3. Independent reads → `Promise.all`.
4. Same query inside a `for` → one `IN (...)` / batch repository method.
5. Dependent writes that must succeed together → one RPC/transaction.
6. Drop fetches whose data is already in memory.
7. Keep tests; add mocks for new RPCs.
8. Fill the measurement table.

---

## 9. Out of scope

| Topic | Why |
|-------|-----|
| Indexes | SQL is not the 200 ms floor |
| `getClaims` / JWKS / middleware / `createSupabaseAdminClient` | Already measured |
| `router.refresh` / `revalidatePath` | Other doc |
| Session/permission caching | Already in place |
| Client-side UI caches | Not this plan |
| One mega-RPC for an entire screen | Harder to test; compose small RPCs |

---

## 10. Suggested first tickets

1. **Phase 0** — apply the late-join SQL (unblock later class timings).  
2. **Phase 1** — timers on the fat services that have none.  
3. **Phase 2** — first real refactor: `Promise.all` class + student on enroll.

After that, stay in **Wave B** until write chains are no longer multi-second. Do not jump to Wave E CRUD for a quick win.
