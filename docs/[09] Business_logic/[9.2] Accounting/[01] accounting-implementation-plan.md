# [01] Accounting — implementation plan (manager panel)

**Project:** Etkan MS (`etkan_ms`)  
**Date:** 2026-07-31  
**Scope:** Manager Accounting — Payment Phases → Student Payment Phases → Payments & Financial Adjustments  
**Out of scope (later):** student portal, installment schedules, upfront auto-billing, monthly payment generation  
**Baseline schema:** `supabase/migrations/20260731190000_accounting_payment_phases.sql` (+ follow-up override for `class_id` / status renames)

---

## Executive summary

Accounting bills **per class (group)**. A manager opens one **active** Payment Phase for a class; every enrolled student gets a **Student Payment Phase (SPP)**. Money math and statuses are **derived**, not hand-set (except cancelling a phase / adjusting / recording payments).

| Layer | Owner | Status model |
|-------|--------|--------------|
| `payment_phases` | Class (`class_id` FK) + copied `semester_code` | `opened` \| `closed` \| `cancelled` — **automatic** except cancel |
| `student_payment_phases` | Student × phase | `pending` \| `partially_paid` \| `paid` \| `cancelled` — **automatic** except cancel-on-leave |
| `student_payments` | SPP | CRUD; triggers recalc |
| `student_financial_adjustments` | SPP (**≤ 1**) | CRUD; triggers recalc |
| `student_financial_forms` | Adjustment (optional aid form) | CRUD with adjustment |

**UI entry:** Manager panel → Accounting (`/manager/accounting`).

---

## 1. Domain model (target)

```text
semesters.semester_code (unique 4-digit)
classes
  └── payment_phases (class_id FK, semester_code copy, ≤1 opened per class)
        └── student_payment_phases (student_id → profiles)
              ├── student_payments (*)
              └── student_financial_adjustments (0..1)
                    └── student_financial_forms (0..1)
```

### 1.1 Payment Phase

| Rule | Detail |
|------|--------|
| Scope | Belongs to one **class** (`class_id` NOT NULL FK → `classes`) |
| Soft semester link | Keep **`semester_code`** copied from the class’s semester at create (not FK) |
| Cardinality | **At most one `opened` phase per class** (partial unique index) |
| Create side-effect | Create an SPP for every **currently enrolled** student in that class |
| Status | Fully automatic among `opened` / `closed`; manager may only **cancel** |
| `closed` meaning | Business “Completed”: every **active** (non-cancelled) SPP is `paid` |
| Reopen | Any event that makes an active SPP unpaid again → phase `closed` → `opened` |

### 1.2 Student Payment Phase (SPP)

| Status | Meaning |
|--------|---------|
| `pending` | Final due &gt; 0 and total paid = 0 |
| `partially_paid` | 0 &lt; total paid &lt; final due |
| `paid` | total paid ≥ final due (includes overpay / credit) |
| `cancelled` | Student left class / assignment voided — excluded from phase completion |

Financial summary (always recalculated):

| Field | Formula |
|-------|---------|
| Original amount | `payment_phases.amount` (live — edits recalculate all SPPs) |
| Financial adjustment | From the single adjustment row (0 if none) |
| Final amount due | `max(0, original − adjustment_as_currency)` *unless* overpay rules below |
| Total paid | `SUM(student_payments.amount)` |
| Remaining | `final_due − total_paid` (may be **negative** = credit) |

**Adjustment as currency:**

- `value_type = fixed` → subtract `value`
- `value_type = percentage` → subtract `original * (value / 100)`
- Cap: adjustment cannot be applied beyond making final due &lt; 0 for status purposes of “due”; remaining may still go negative via overpayment

**Overpayments allowed:** remaining &lt; 0 → UI “Credit” badge; SPP status still `paid`.

### 1.3 Enrollment sync (edge cases — mandatory)

| Event | Behavior |
|-------|----------|
| Phase created for class | Insert SPP for each `student_class` with `status = enrolled` |
| Student enrolled into class (late join) | If class has `opened` **or** `closed` phase: create SPP; if phase was `closed`, **reopen** to `opened` + recalc |
| Student paused / stopped / removed from class | Mark their SPP `cancelled` (if any for that class’s phase); recalc phase |
| Student changes class | = leave old class (cancel old SPP); **do not** auto-create SPP on new class — manager assigns manually if needed |
| Class has `cancelled` phase only | Late join does **not** auto-create; manager must create/open a new phase |
| Multiple historical phases | Sync attaches only to the class’s **current non-cancelled** phase: prefer `opened`, else `closed` (reopen path). Never attach to `cancelled` |

### 1.4 What managers cannot do

- Manually set Payment Phase to `closed` / `opened` (except cancel → `cancelled`, and system reopen from `closed`)
- Manually set SPP to `pending` / `partially_paid` / `paid` (except cancel via leave flow)
- Have two `opened` phases on the same class
- Have two financial adjustments on the same SPP

---

## 2. Schema changes required (before UI)

### Migration override (Phase 0)

Current table needs:

1. Add `payment_phases.class_id uuid NOT NULL REFERENCES classes(id)` (handle empty table / backfill strategy if any rows exist).
2. Partial unique: **one opened phase per class**  
   `UNIQUE (class_id) WHERE status = 'opened'`
3. Align statuses:
   - Phase: `opened | closed | cancelled` (map business “Completed” → `closed`)
   - SPP: replace `standing_by | completed | cancelled` → `pending | partially_paid | paid | cancelled`
4. Unique: **one adjustment per SPP**  
   `UNIQUE (student_payment_phase_id)` on `student_financial_adjustments`
5. Indexes: `payment_phases(class_id)`, `payment_phases(status)`, SPP `(payment_phase_id, status)`
6. Optional denormalized cache columns on SPP (recommended for list perf):  
   `original_amount`, `adjustment_amount`, `final_amount_due`, `total_paid`, `remaining_amount`  
   maintained by service recalc (not triggers required for v1 — service layer is source of truth)

Keep `semester_code` on `payment_phases` as copied text.

Update `types/supabase.ts` + `docs/[06] Database/etkan-ms-schema-latest-dbdiagram.dbml` after migrate.

---

## 3. Status engines (pure functions)

Implement in `lib/manager/accounting/` (no DB access):

### 3.1 `computeSppFinancials(phaseAmount, adjustment | null, payments[])`

Returns `{ original, adjustmentAmount, finalDue, totalPaid, remaining }`.

### 3.2 `deriveSppStatus(financials, currentStatus)`

- If `cancelled` → stay `cancelled`
- Else if `totalPaid <= 0` and `finalDue > 0` → `pending`
- Else if `remaining > 0` → `partially_paid`
- Else → `paid` (`remaining <= 0`)

### 3.3 `derivePaymentPhaseStatus(phaseStatus, activeSppStatuses[])`

- If phase `cancelled` → stay `cancelled`
- Active = SPPs where status ≠ `cancelled`
- If active.length === 0 → keep `opened` (or `closed` only when policy says empty class closes — **v1: stay `opened` until cancelled or all paid**)
- If every active SPP is `paid` → `closed`
- Else → `opened`

Call this trio after: phase amount edit, payment CUD, adjustment CUD, enroll/leave sync.

---

## 4. RBAC

Keys (also in `lib/constants/permissions.ts` + `docs/[11] RBAC/[02]`):

| Key | Access | Use |
|-----|--------|-----|
| `accounting.view` | read | Accounting home, phase list/detail, SPP detail (read) |
| `accounting.payment_phases.create` | write | Create phase (+ auto SPPs) |
| `accounting.payment_phases.update` | write | Edit amounts/dates/name (triggers recalc) |
| `accounting.payment_phases.cancel` | write | Cancel phase |
| `accounting.payments.create` | write | Add payment on SPP |
| `accounting.payments.update` | write | Edit payment |
| `accounting.payments.delete` | write | Delete payment |
| `accounting.adjustments.create` | write | Create the one adjustment (+ optional form) |
| `accounting.adjustments.update` | write | Edit adjustment / form |
| `accounting.adjustments.delete` | write | Remove adjustment |

Enforce in: route layouts / page gates, server actions, services (`assertPermission` / `getUnauthorizedError`), and `Can` in UI.

Seed: `npm run seed:rbac` after adding keys (manager gets all).

---

## 5. Routes & UI map (manager)

| Route | Purpose |
|-------|---------|
| `/manager/accounting` | Home: Payment Phases table + Missing-SPP table |
| `/manager/accounting/phases/[phaseId]` | Phase detail: meta + SPP table + CRUD entry points |
| `/manager/accounting/phases/[phaseId]/students/[sppId]` | SPP detail: financial summary, payments, adjustment |

Optional later: nested sheets instead of deep routes — **prefer routes** for shareable detail (matches classes pattern).

### 5.1 Accounting home

**Table A — Payment phases**

Columns (suggested): name, class, semester code, status, amount, upfront, date range, enrolled SPP counts (`paid` / active), created.

Actions: Create, open detail, cancel (permission-gated).

**Table B — Students missing SPP for an active phase**

Definition (locked for v1):

> `student_class.status = enrolled`  
> AND class has a payment phase with `status = opened`  
> AND no `student_payment_phases` row for that `(student_id, payment_phase_id)`  
> (excluding cancelled-only mismatches — they should not appear if sync worked)

Actions: “Assign / repair” → creates missing SPP + recalc (safety net if sync missed).

### 5.2 Phase detail

- Header: class link, semester code, status badge (read-only), amounts, dates
- Edit phase dialog (`payment_phases.update`)
- Cancel phase (`payment_phases.cancel`) — confirm; cancels open billing, policy: cancel non-paid SPPs or freeze — **v1: set phase `cancelled`; leave existing SPPs as-is except block new payments** (document in service)
- SPP table: student, status, original, adjustment, due, paid, remaining, credit badge
- Manual add SPP (edge: student enrolled but missing) if needed

### 5.3 SPP detail

- Financial summary cards (always from recalc)
- Payments table + create/edit/delete dialogs
- Single Financial Adjustment section (create or edit; delete)
- Optional Financial Form section when adjustment exists (aid fields)

Toasts: Sonner helpers only. Mutation dialogs: pending-aware open + success close.

---

## 6. Service / repository layout

Follow Etkan layers:

| Layer | Modules |
|-------|---------|
| `repositories/` | `payment-phase.repository.ts`, `student-payment-phase.repository.ts`, `student-payment.repository.ts`, `student-financial-adjustment.repository.ts`, `student-financial-form.repository.ts` |
| `services/` | `payment-phase.service.ts`, `student-payment.service.ts`, `student-financial-adjustment.service.ts`, `accounting-sync.service.ts` (enroll/leave hooks) |
| `lib/manager/accounting/` | pure calc + status derive + money formatters |
| `app/manager/accounting/` | `page.tsx`, `[phaseId]/page.tsx`, `.../students/[sppId]/page.tsx`, `actions.ts` |
| `components/manager/accounting/` | panels, tables, dialogs |

Hook points in existing class enrollment services:

- After successful **enroll / bulk enroll** → `accountingSync.onStudentJoinedClass`
- After **pause / stop / remove** → `accountingSync.onStudentLeftClass`
- Class transfer (if exists) → leave old only

---

## 7. Implementation phases (task-based)

### Phase 0 — Schema & permissions foundation

- [x] **T0.1** Write migration: add `class_id`, status renames, partial unique (one opened/class), one adjustment/SPP unique, indexes, optional SPP money cache columns
- [x] **T0.2** Regenerate / hand-update `types/supabase.ts`
- [x] **T0.3** Update DBML snapshot under `docs/[06] Database/`
- [x] **T0.4** RBAC keys in `permissions.ts` + this plan’s catalog already mirrored in `[02] permission-definitions.md`
- [x] **T0.5** `npm run seed:rbac`
- [x] **T0.6** Unit tests for pure calc + status derive (`lib/manager/accounting/*.test.ts`)

**Exit:** migration applies cleanly; calc tests green; permissions seeded.

---

### Phase 1 — Accounting home (read + create phase)

- [x] **T1.1** Gate `/manager/accounting` with `accounting.view`
- [x] **T1.2** `listPaymentPhasesForManager` + table UI (filter/search/status)
- [x] **T1.3** `listMissingSppForOpenedPhases` + table UI + repair action
- [x] **T1.4** Create Payment Phase dialog: pick class (only classes without `opened` phase), amounts, dates, duration, name; copy `semester_code` from class’s semester
- [x] **T1.5** On create: insert phase `opened` + bulk insert SPPs for enrolled students + initial financials (`pending`)
- [x] **T1.6** Toasts + audit logs on create

**Exit:** manager can open a phase for a class and see students appear as SPPs.

---

### Phase 2 — Phase detail + phase update/cancel

- [x] **T2.1** Phase detail route + header + SPP table
- [x] **T2.2** Update phase (amount/dates/name) → recalc **all** non-cancelled SPPs + phase status
- [x] **T2.3** Cancel phase flow + UI confirm
- [x] **T2.4** Block create when class already has `opened` phase (service + unique index)

**Exit:** phase CRUD (create/update/cancel) + live SPP list.

---

### Phase 3 — SPP detail: payments

- [x] **T3.1** SPP detail route + summary cards
- [x] **T3.2** Payments list + create/update/delete
- [x] **T3.3** After each payment CUD → recalc SPP financials/status → recalc phase status (reopen if needed)
- [x] **T3.4** Credit badge when `remaining < 0`
- [x] **T3.5** Block payment CUD when phase is `cancelled` (and optionally when SPP `cancelled`)

**Exit:** can record money and see statuses move pending → partially_paid → paid → phase closed.

---

### Phase 4 — Financial adjustments (+ forms)

- [x] **T4.1** Enforce ≤1 adjustment per SPP in service + DB
- [x] **T4.2** Create/update/delete adjustment → recalc SPP + phase
- [x] **T4.3** Financial form create/update tied to adjustment (fields from schema)
- [x] **T4.4** Percentage vs fixed validation (0–100 for %)

**Exit:** discounts/scholarships change due and statuses correctly.

---

### Phase 5 — Enrollment sync & edge-case hardening

- [x] **T5.1** Hook enroll → auto SPP + reopen closed phase
- [x] **T5.2** Hook leave / pause / stop → cancel SPP + recalc (phase may close if all remaining paid)
- [x] **T5.3** Class change = leave only (no auto-assign on new class)
- [x] **T5.4** Missing-SPP repair action uses same sync helper
- [x] **T5.5** Service tests for: late join on closed phase, leave last unpaid student, overpay, amount edit after payments, delete payment reopening phase
- [x] **T5.6** Audit log coverage for phase/payment/adjustment mutations

**Exit:** edge cases covered by tests; missing table stays empty under normal enroll flow.

---

### Phase 6 — Polish (manager UX)

- [ ] **T6.1** Empty states, filters, pagination parity with other manager panels
- [ ] **T6.2** Links: phase → class detail; SPP → student detail
- [ ] **T6.3** Print/export later (not required for v1)
- [ ] **T6.4** Update this doc’s checklist as tasks complete

---

## 8. Edge-case matrix (acceptance)

| # | Scenario | Expected |
|---|----------|----------|
| E1 | Create phase on class with 10 enrolled | 10 SPPs `pending`, phase `opened` |
| E2 | Second `opened` phase same class | Rejected |
| E3 | Late enroll while phase `opened` | New SPP `pending` |
| E4 | Late enroll while phase `closed` | Phase → `opened`, new SPP `pending` |
| E5 | Late enroll while only `cancelled` phase | No auto SPP |
| E6 | Student leaves / stopped | SPP → `cancelled`; if others all `paid` → phase `closed` |
| E7 | Student moves to another class | Old SPP cancelled; no auto SPP on new class |
| E8 | Pay full amount | SPP `paid`; if all active paid → phase `closed` |
| E9 | Overpay | `remaining < 0`, SPP `paid`, Credit badge |
| E10 | Delete payment after phase closed | SPP may leave `paid`; phase reopens |
| E11 | Edit phase amount upward | Recalc; some SPPs may leave `paid` → phase reopens |
| E12 | Add 100% scholarship | `finalDue = 0`, SPP `paid` (0 paid ok), may close phase |
| E13 | Second adjustment | Rejected |
| E14 | Payment on cancelled SPP/phase | Rejected |
| E15 | Missing-SPP row appears | Repair creates SPP |

---

## 9. Non-goals (explicit)

- Student-facing finance UI  
- Installment / monthly auto invoices  
- Upfront mandatory schedule enforcement  
- Linking payments to external gateways  
- Soft-deleting payment history (hard delete allowed in v1 with recalc)  
- Multi-currency  

---

## 10. Suggested build order (summary)

```text
Phase 0  Schema + calc lib + RBAC
Phase 1  Accounting home + create phase + auto SPPs
Phase 2  Phase detail + update/cancel
Phase 3  SPP payments + status engine live
Phase 4  Adjustments + forms
Phase 5  Enrollment sync + edge-case tests
Phase 6  UX polish
```

Start implementation at **Phase 0 → Phase 1** so the Accounting page becomes the real flow entry immediately after schema is clean.

---

## 11. Open micro-decisions (defaults locked for v1)

| Topic | v1 default |
|-------|------------|
| Business “Completed” | DB status `closed` |
| Empty class after all leave | Phase stays `opened` until manager cancels (or all were paid then `closed` with zero active SPPs — prefer **cancel manually**) |
| Cancelled phase + existing payments | Keep payment rows; block new payments |
| Who is “enrolled” for auto SPP | `student_class.status = enrolled` only |
| Amount source of truth | Live from `payment_phases.amount` (no SPP amount snapshot) |

If product later needs frozen amounts per student, add `spp.original_amount_snapshot` in a follow-up migration.
