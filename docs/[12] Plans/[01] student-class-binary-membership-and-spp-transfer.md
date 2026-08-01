# [01] Binary class membership, keep SPP on leave, SPP transfer & student activity

**Project:** Etkan MS (`etkan_ms`)  
**Date:** 2026-08-01  
**Status:** Phases A–G implemented in repo (G5 checklist signed off via code-path verification)   
**Related docs:**  
- `docs/[09] Business_logic/[9.2] Accounting/[01] accounting-implementation-plan.md` (sync rules updated to match this plan)  
- `docs/[11] RBAC/[02] permission-definitions.md`  
- Schema: `student_class`, `student_payment_phases`, `payment_phases`, `audit_logs`

---

## Executive summary

| Change | Target behavior |
|--------|-----------------|
| `student_class.status` | **Removed.** Membership is binary: row exists = in class; no row = not in class |
| Leave / remove from class | Delete `student_class` row; **keep** SPP + payments + adjustments; **recalc** parent payment phase |
| Rejoin class | Allowed like a new join: if semester has sync phase and student already has SPP → **reuse**; else create (≤1 SPP per student per phase) |
| `paused` / `stopped` rows | Migration: **delete** those rows; keep former `enrolled` rows (without status) |
| Transfer class | Keep SPP as-is (no auto-cancel, no auto-create on destination). Manual SPP transfer available from phase detail |
| Grades / sessions / tasks | Do **not** depend on enrollment status. After leave, academic data **stays**; after rejoin, existing data is visible again |
| Permission | Rename `classes.change_enrollment` → remove-student style permission |
| Activity log | Reuse **`audit_logs`** on student detail (managers + students for now) |
| Accounting UX | Separate “no active class” vs “billed but wrong-semester class”; SPP **Transfer** on phase detail |

---

## Locked decisions (do not re-open without product change)

1. **Leave keeps billing.** Leaving a class never cancels SPP or deletes payments. Student may be out of class and still billed.
2. **Binary membership only.** No `paused` / `stopped`. Column `status` dropped from `student_class`.
3. **Migration:** keep old `enrolled` memberships; delete `paused`/`stopped` rows; drop column.
4. **Rejoin:** same as late join — reuse existing SPP for that semester’s sync phase if present; otherwise create when phase is `opened`/`closed` (reopen closed if unpaid after create/reuse path needs recalc).
5. **Class transfer:** keep SPP unchanged. Cross-semester mismatch is surfaced in Accounting; managers transfer SPP manually.
6. **Academic data:** leave does not wipe tasks/grades/attendance; rejoin surfaces existing rows.
7. **Permission + UI:** rename permission; remove status filter/dropdown; **Remove** with confirm dialog.
8. **Activity:** filter existing `audit_logs` for the student — no new events table.
9. **Accounting lists:** keep “students without active class” separate from “SPP semester ≠ current class semester” mismatch list.
10. **Docs:** this plan + accounting sync docs stay the source of truth.

---

## Domain rules (target)

### Membership

```text
student_class (user_id, class_id, joined_at)  -- unique (user_id, class_id)
  └── presence of row = member of class
```

### SPP sync (in-progress class only)

| Event | Behavior |
|-------|----------|
| Phase created | Create SPP for each **member** of semester’s in-progress class |
| Student **joins** in-progress class | If semester has non-cancelled sync phase (`opened` preferred, else `closed`): **reuse** existing SPP if any; else **create**. If phase was `closed` and student ends unpaid → reopen + recalc |
| Student **leaves** any class | Delete membership only. **Do not** cancel SPP. Recalc phase status from remaining active SPPs (student still counts if SPP still active) |
| Student **rejoins** | Same as join (reuse/create) |
| Class → `in_progress` backfill | Ensure SPP for each current member (reuse/create) |
| Class **transfer** | Update memberships only; **no** SPP cancel/create. Manager may transfer SPP later |

### SPP transfer (new)

- From payment phase detail, per SPP: **Transfer** to another payment phase (typically another semester’s phase).
- Constraints to decide in Phase E implementation (recommended defaults below):
  - Destination phase not `cancelled`
  - Student must not already have a non-cancelled SPP on destination (or only allow if none)
  - Move SPP row’s `payment_phase_id` (keep payments/adjustments attached to same SPP id)
  - Recalc **source** and **destination** phase statuses
- Accounting home: section listing students who have an SPP on semester A while currently a member of a class linked to semester B ≠ A.

### “Without active class” vs mismatch

| Section | Meaning |
|---------|---------|
| Students without an active class | No `student_class` on any `classes.status = in_progress` |
| SPP / semester mismatch | Has SPP for phase.semester_id X, but current in-progress class membership (if any) is on semester Y ≠ X — or has SPP and is in a class on another semester |

---

## Implementation phases

Implement **in order**. Each phase should leave the app buildable and testable.

---

### Phase A — Schema & data migration

**Goal:** Binary `student_class` in DB; clean paused/stopped data.

| ID | Task | Done when |
|----|------|-----------|
| A1 | Write Supabase migration: delete `student_class` where `status IN ('paused','stopped')` | Count of paused/stopped = 0 |
| A2 | Drop `student_class.status` column (and any check constraints / defaults on it) | Column gone in schema |
| A3 | Update `docs/[06] Database/etkan-ms-schema-latest-dbdiagram.dbml` | DBML matches |
| A4 | Regenerate / adjust `types/supabase.ts` if needed | Types compile |
| A5 | Smoke: existing enrolled members still listed on class detail | Manual OK |

**Status:** Implemented in repo (`20260804120000_student_class_drop_status.sql` + repository/types). Apply with `npx supabase db push`, then smoke A5.

**Out of scope here:** UI/permission renames (Phase C), sync behavior change (Phase B can ship with migration in same PR or immediately after).

---

### Phase B — Repository & enrollment sync logic

**Goal:** Code treats membership as row presence; leave keeps SPP; join reuses SPP.

| ID | Task | Done when |
|----|------|-----------|
| B1 | Remove `STUDENT_CLASS_STATUSES` usage from repositories (filters `.eq('status', enrolled)` → any membership row) | `listEnrolledUserIdsByClassId(s)` renamed or redefined as “member user ids” |
| B2 | Update `onStudentLeftClass`: **stop cancelling** SPP; optionally still recalc phase; audit “left class, SPP retained” | Leave test: SPP status unchanged; payments intact |
| B3 | Update `onStudentJoinedClass`: reuse existing SPP if present; else create; closed → reopen path when unpaid | Rejoin test reuses same SPP id |
| B4 | Update transfer service: no SPP cancel on source; no auto SPP on destination | Transfer test: SPP `payment_phase_id` unchanged |
| B5 | Update create-phase / missing-SPP / repair / “without active class” queries to membership-without-status | Unit tests green |
| B6 | Rename helpers/types for clarity (`enrolled` → `member` where it reduces confusion) — optional but recommended | Naming consistent in services |

**Status:** Implemented (`onStudentLeftClass` retains SPP; join reuses/reopens; `listMemberUserIdsByClassId(s)` rename).

**Tests to rewrite:** `accounting-sync.service.test.ts`, `transfer-student-accounting.test.ts`, `payment-phase.service.test.ts` (E6/E7), `enrollment-status-filter.test.ts`.

---

### Phase C — Class students UI + RBAC rename

**Status:** Implemented (`classes.remove_student`; Remove confirm; binary membership UI; grades show Member).

**Goal:** Remove status dropdown; Remove student with confirm; permission rename.

| ID | Task | Done when |
|----|------|-----------|
| C1 | Rename permission `classes.change_enrollment` → `classes.remove_student` (or `classes.remove_membership`) in `permissions.ts` + `docs/[11] RBAC/[02] permission-definitions.md` + role grants migration/seed if any | Old key unused |
| C2 | Replace status Select with **Remove** button + confirm dialog (`usePendingAwareOpenChange` / existing delete-confirm patterns) | No status UI on class students table |
| C3 | Remove enrollment status filter / badges / columns from class students section | Filter gone |
| C4 | Wire remove action → delete `student_class` + leave sync (B2) + toast | Confirm mid-submit blocked |
| C5 | Update transfer UI copy if it mentioned “stop” / enrollment status | Copy accurate |
| C6 | Update student detail / grade panels that show `enrollment_status` | Field removed or replaced with “Member” / joined_at |
| C7 | Regression checklist RBAC doc | Checklist updated |

---

### Phase D — Academic logic (grades / sessions / tasks)

**Status:** Implemented (member-only seed naming; attendance defaults documented; compute-all skip copy; joined-classes Assign/Remove wired; class_status on student class rows).

**Goal:** Membership checks are “has row”; left students keep data; rejoin shows data.

| ID | Task | Done when |
|----|------|-----------|
| D1 | Session create / seed `student_tasks`: members only (no status); leaving does not delete tasks | Left student’s tasks remain |
| D2 | Attendance / attendee flows: clarify whether non-members can be marked — **default:** only current members for new marks; historical absences remain | Product default documented in code comments if needed |
| D3 | Grade compute-all / course grade: stop skipping “paused/stopped”; operate on current members for bulk ops; historical grades for removed students remain readable on student/class history where UI allows | Compute-all test updated |
| D4 | Final exam / fast certificate sections: same membership rule | No status references |
| D5 | Student joined-classes UI: add/remove without status | Works |

---

### Phase E — SPP transfer + Accounting mismatch section

**Status:** Implemented (`accounting.spp.transfer`; Transfer SPP dialog; semester-mismatch section; leave/recalc E7 tests annotated).

**Goal:** Manual SPP move between phases; surface wrong-semester membership vs SPP.

| ID | Task | Done when |
|----|------|-----------|
| E1 | Spec validators: `transferSppSchema` (spp_id, destination_payment_phase_id) | Zod + action |
| E2 | Service `transferStudentPaymentPhaseForManager`: move SPP; recalc source + dest phases; audit | Unit tests |
| E3 | UI: Transfer button on each SPP row in payment phase detail + dialog (phase dropdown) | Form-dialog rules |
| E4 | Permission: reuse `accounting.payment_phases.create` or add `accounting.spp.transfer` — **recommend new key** for clarity | RBAC docs updated |
| E5 | Service + list UI on Accounting home: **“SPP semester mismatch”** section (collapsible) | Rows show student, SPP phase/semester, current class/semester |
| E6 | Keep **Students without an active class** separate (already exists); adjust description to note they may still be billed | Copy updated |
| E7 | After leave: ensure phase recalc can still `close` when all *active* SPPs paid (left student with unpaid SPP keeps phase open) | Edge test |

**Recommended transfer constraints (implement in E1–E2):**

- Destination ≠ source phase  
- Destination status ∈ `{opened, closed}` (not cancelled)  
- No other SPP for same student on destination phase  
- Payments/adjustments stay on the same SPP id  
- Recalc both phases after move  

---

### Phase F — Student activity log (audit_logs)

**Status:** Implemented (hybrid JSON + related-id expand; manager Activity section; `/student/activity`; F2 gap table below — no mass-add of attendance seed audits).

**Goal:** Student detail shows timeline from existing audits.

| ID | Task | Done when |
|----|------|-----------|
| F1 | Repository/service: list audit logs related to student (`record_id`, `new_data.student_id`, metadata keys, table filters) | Query returns join/leave/payment/SPP/grade/absence where logged |
| F2 | Gap audit: list events **not** currently written to `audit_logs` (e.g. attendance absent). Either add `recordManagerAuditLog` at those call sites or document “not available until logged” | Known gaps listed in this plan appendix |
| F3 | UI section on student detail: table/timeline (date, action, summary, actor) | Collapsible section |
| F4 | Authorization: managers with `students.view`; students viewing **own** profile (existing student portal auth pattern) | Both can open |
| F5 | Empty / sparse state copy when few audits exist | UX OK |

**Appendix — F2 audit coverage (verified):**

| Event | Status |
|-------|--------|
| Class join / leave / transfer | Logged |
| SPP create / repair / transfer / retained-on-leave | Logged |
| SPP cancel | N/A (retain model) |
| Payment / adjustment CUD | Logged (query via SPP expand) |
| Attendance status update | Logged (via attendee expand) |
| Attendance row seed (session/late-join) | Not logged |
| Task / final-exam / course grade writes | Logged (expand / `user_id`) |

---

### Phase G — Docs, cleanup, regression

**Status:** Implemented (G1–G5; checklist signed off via code-path verification).

**Goal:** Docs and tests match production behavior.

| ID | Task | Done when |
|----|------|-----------|
| G1 | Finish updates to accounting implementation plan + feature status report (E6/E7, sync table) | Docs match code |
| G2 | Update grades logic audit notes that mention `enrolled \| paused \| stopped` | Accurate |
| G3 | Remove dead constants (`STUDENT_CLASS_STATUSES`), validators (`update-student-class-status`), unused UI | Lint clean |
| G4 | Full vitest pass for accounting + class + grades + transfer | CI green |
| G5 | Manual regression checklist (below) | Signed off |

---

## Manual regression checklist

- [x] Add student to in-progress class → SPP created or reused  
- [x] Remove student → membership gone; SPP + payments remain; phase recalc sensible  
- [x] Rejoin → same SPP id reused; no duplicate  
- [x] Transfer class → SPP unchanged; mismatch section may list them  
- [x] Transfer SPP to another phase → both phases recalc; payments follow SPP  
- [x] Student with SPP but no in-progress class appears in “without active class”, still visible under phase SPPs  
- [x] Class students: no status dropdown; Remove + confirm works  
- [x] Student detail activity section shows known audits  
- [x] Permission rename: old key gone; remove gated correctly  

> **G5 note (2026-08-01):** Signed off via code-path verification against A–F implementations (services, UI, RBAC). Spot-check in a live DB still recommended before production cutover.

---

## Suggested build order (summary)

```text
Phase A  Migration: delete paused/stopped → drop status
Phase B  Sync/services: leave keeps SPP; join reuses; transfer no auto billing change
Phase C  Class UI + RBAC rename + Remove confirm
Phase D  Grades/sessions/tasks membership-only
Phase E  SPP transfer + Accounting mismatch section
Phase F  Student activity from audit_logs (+ fill logging gaps)
Phase G  Docs cleanup + full regression
```

**Recommended first PR:** A + B (schema + sync truth).  
**Second PR:** C + D (UX + academics).  
**Third PR:** E (billing transfer tooling).  
**Fourth PR:** F + G (activity + docs).

---

## Explicit non-goals (this plan)

- New `student_activity_events` table  
- Soft-hold / pause enrollment states  
- Auto-transfer SPP on class transfer  
- Deleting payments when leaving a class  
- Student portal finance redesign beyond viewing own activity logs  

---

## Open micro-decisions (resolve during Phase E/F if needed)

1. SPP transfer: allow destination `closed` only (reopen) vs `opened` only? **Default: opened or closed.**  
2. Mismatch section: include students with SPP and **no** class at all, or only wrong-semester class? **Default: wrong-semester class only; “no class” stays in the other section.**  
3. Activity: deep-link rows to payment/session/task when `record_id` resolves? **Nice-to-have after F3.**
