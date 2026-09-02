# [02] Accounting — feature status report

**Project:** Etkan MS  
**Date:** 2026-07-31  
**Companion:** [`[01] accounting-implementation-plan.md`](./[01]%20accounting-implementation-plan.md)  
**Scope:** Manager Accounting v1 (Payment Phases → SPPs → Payments → Adjustments / Forms)  
**Verdict:** Core requirements for Phases 0–6 are **implemented and covered by unit tests**. Remaining items are mostly **deferred non-goals**, **intentional product defaults**, or **operational edge cases** (not silent bugs in the happy path).

---

## How to read this report

Each section is a **task / capability**. For every task:

| Field | Meaning |
|-------|---------|
| **Status** | `Working` · `Working with caveats` · `Deferred` · `Out of scope` |
| **What works** | Confirmed behavior in code + tests |
| **Caveats / risks** | Edge cases, intentional limits, or failure modes operators should know |
| **Proof** | Primary files / tests |

Acceptance scenarios **E1–E15** are referenced where they apply (see plan §8).

---

## 0. Delivery snapshot

| Phase (plan §7) | Status |
|-----------------|--------|
| 0 Schema + calc + RBAC | Done |
| 1 Accounting home + create phase + auto SPPs | Done |
| 2 Phase detail + update / cancel | Done |
| 3 SPP payments + status engine | Done |
| 4 Adjustments + forms | Done |
| 5 Enrollment sync + edge tests | Done |
| 6 UX polish | Done except **T6.3 print/export** (deferred) |

**UI entry:** `/manager/accounting`  
**Detail:** `/manager/accounting/phases/[phaseId]`  
**SPP:** `/manager/accounting/phases/[phaseId]/students/[sppId]`

**Domain lock:** Phases bind to **`semester_id`** (not `class_id`). Who gets billed = students enrolled on that semester’s **`in_progress`** class (oldest `created_at` if several).

---

## Task 1 — Schema & data model

**Status:** Working

### What works
- Tables: `payment_phases`, `student_payment_phases`, `student_payments`, `student_financial_adjustments`, `student_financial_forms`
- `payment_phases.semester_id` FK → `semesters`; denormalized `semester_code` at create
- At most one **`opened`** phase per semester (partial unique index)
- Unique SPP `(student_id, payment_phase_id)`
- At most one financial adjustment per SPP
- Status enums aligned: phase `opened|closed|cancelled`; SPP `pending|partially_paid|paid|cancelled`
- Cached money columns on SPP maintained by service recalc

### Caveats / risks
- After the semester override migration, orphan phases that could not resolve a semester were **deleted** (dev-safe). Production DBs with real data need a careful apply path if any rows predated the override.
- Billing class is **not** stored on the phase — always resolved at runtime. If class status changes, billing membership does **not** auto-backfill (see Task 7).

### Proof
- `supabase/migrations/20260731190000_accounting_payment_phases.sql`
- `supabase/migrations/20260802000000_accounting_phase_semester_id.sql`
- `docs/[06] Database/etkan-ms-schema-latest-dbdiagram.dbml`
- `types/supabase.ts`

---

## Task 2 — Permissions & access

**Status:** Working

### What works
| Permission | Use |
|------------|-----|
| `accounting.view` | List / detail routes |
| `accounting.payment_phases.create` | Create phase, repair missing SPP |
| `accounting.payment_phases.update` | Edit phase amounts/dates |
| `accounting.payment_phases.cancel` | Cancel phase |
| `accounting.payments.*` | Payment CUD |
| `accounting.adjustments.*` | Adjustment CUD (+ form with adjustment) |

Services assert permissions; UI uses `<Can>`.

### Caveats / risks
- Enrollment sync is triggered from **class** actions (`CLASSES_*`), not accounting permissions — correct, but managers without accounting rights can still cause SPP **create** on join and phase **recalc** on leave/transfer (leave does **not** cancel SPP).
- CEO `/ceo/accounting-analysis` is **not** this feature (placeholder / separate surface).

### Proof
- `lib/constants/permissions.ts`
- `docs/[11] RBAC/[02] permission-definitions.md`
- `lib/auth/manager-route-permissions.ts`

---

## Task 3 — Create payment phase + seed SPPs

**Status:** Working

### What works
- Manager picks a **semester** (picker excludes semesters that already have an opened phase / missing code)
- Copies `semester_code`; creates phase as `opened`
- Seeds one SPP per **`student_class` membership row** on the resolved **in-progress** class (**E1**; binary membership — no enrollment status)
- Rejects second opened phase for the same semester (**E2**)
- If **no** in-progress class: phase still creates with **zero** SPPs (intentional)

### Caveats / risks
- At most one `in_progress` class per semester is enforced on status change; resolver still picks oldest if legacy dual rows exist.
- SPP `original_amount` tracks **live** phase amount (no per-student freeze) — plan §11 default.

### Proof
- `services/accounting/payment-phase.service.ts` (`createPaymentPhaseForManager`)
- `services/accounting/payment-phase.service.test.ts`
- UI: `create-payment-phase-dialog.tsx`, `app/manager/accounting/page.tsx`

---

## Task 4 — Accounting home (list, missing SPP, repair)

**Status:** Working

### What works
- Phase list: search, status filter, pagination, empty vs filtered copy
- Stats: total / opened / missing assignment count
- Semester name links to semester detail
- Missing-SPP table: enrolled on billing class with no SPP row for opened phases
- Repair creates SPP via shared ensure helper (**E15**)

### Caveats / risks
- Missing table has **no** pagination (usually small; intentional Phase 6 scope).
- Repair fails if there is **no** in-progress class for the semester — expected; operator must set a class in progress first.
- If sync swallows an error on enroll (Task 7), Missing table + Repair are the **safety net**.

### Proof
- `components/manager/accounting/manage-accounting-panel.tsx`
- `listMissingSppForOpenedPhases` / `repairMissingSppForManager`
- `RepairMissingSppButton`

---

## Task 5 — Phase detail (view, edit, cancel)

**Status:** Working

### What works
- Detail shows semester + optional billing class links, amounts, dates, SPP paid/active counts
- SPP table: search, status filter, pagination; student → student profile; Eye → SPP detail
- Edit amount/upfront/dates → recalc non-cancelled SPPs; may reopen `closed` → `opened` (**E11**)
- Cancel → phase `cancelled`; existing SPPs/payments **kept**; new payments blocked (**E14** path)

### Upfront-aware paid counter

A phase is in **upfront mode** when it is `opened`, has `upfront_amount > 0`, and today (in `Asia/Beirut`) falls in `[start_date, start_date + 1 month)`.

- In upfront mode the numerator of `SPP paid / active` counts non-cancelled SPPs where `total_paid >= upfront_amount`, **or** the SPP is already fully `paid`. Adjustments are deliberately ignored in the threshold — the upfront is a phase-level amount compared against the raw paid total — while the `paid` branch keeps fully settled students counted when a discount pushed their due below the upfront.
- Outside upfront mode (no upfront, past the first month, or a `closed` / `cancelled` phase) the numerator is SPPs with status `paid`, as before. The denominator is always the non-cancelled SPP count.
- The mode is decided server-side and shipped as `upfront_window_active` on the phase row, so the list cell, the detail field, and the per-student badges cannot disagree or drift with the viewer's clock. An "Upfront" chip marks the counter while the mode is on.
- Students who covered the upfront show a display-only **Upfront paid** badge. Nothing is persisted: `deriveSppStatus`, recalc, and all money math are untouched, and the status filters still filter on the persisted status.

### Caveats / risks
- Managers **cannot** manually set phase to `closed` / `opened` (except cancel, and system reopen) — by design.
- Cancel does **not** cancel SPPs or delete payments.
- Empty active SPP set (everyone left unpaid then cancelled) → phase stays **`opened`** until manual cancel (plan §11).
- An upfront-paid student still appears under the "Partially paid" filter, matching their persisted status and money columns.

### Proof
- `payment-phase-details-panel.tsx`
- `updatePaymentPhaseForManager` / `cancelPaymentPhaseForManager` tests
- `lib/manager/accounting/upfront-window.test.ts`, `lib/manager/accounting/spp-display-status.test.ts`
- `listPaymentPhasesForManager SPP counts` tests

---

## Task 6 — SPP detail: payments

**Status:** Working

### What works
- Summary cards + Credit badge when `remaining < 0` / `has_credit` (**E9**)
- Payment create / update / delete with recalc
- Full pay → SPP `paid`; all active paid → phase `closed` (**E8**)
- Delete covering payment after close → phase can reopen (**E10**)
- Blocked when phase or SPP is `cancelled` (**E14**)

### Caveats / risks
- Payments are **hard-deleted** (no soft delete) — non-goal for soft history.
- Overpay is allowed by design; remaining can be negative.
- No installment schedule / upfront enforcement (non-goals).

### Proof
- `spp-details-panel.tsx`, `student-payment.service.ts` + tests
- `lib/manager/accounting/accounting-calc.test.ts`

---

## Task 7 — Enrollment sync (join / leave / transfer)

**Status:** Updated 2026-08-01 (Phase B) — leave **retains** SPP; join/rejoin **reuses** existing SPP

> Full tasks: `docs/[12] Plans/[01] student-class-binary-membership-and-spp-transfer.md`  
> Domain lock: `docs/[09] Business_logic/[9.2] Accounting/[01] accounting-implementation-plan.md` §1.3

### What works
| Event | Behavior |
|-------|----------|
| Join **in-progress** class, phase `opened` | Reuse existing SPP or create `pending` (**E3**) |
| Join in-progress, phase `closed` | Reopen phase + reuse/create SPP (**E4**) |
| Join when only `cancelled` phase exists | No auto SPP (**E5**) |
| Join **non**–in-progress class | No payment sync |
| Leave / removed from billing class | Membership deleted; **SPP kept**; phase recalc (**E6**) |
| Rejoin after leave (same phase) | Reuse existing SPP (reactivate only if legacy cancelled) |
| Transfer | Leave retains SPP; destination enroll with **`skipPaymentSync: true`** (**E7**) |
| Class → `in_progress` | Reject second in-progress per semester; backfill/reuse SPPs for sync phase |
| Sync throws | Membership change still succeeds; audit + toast `warning` |

### Remaining caveat
- Transfer intentionally does **not** bill the destination class even if it is in-progress (product lock). Manual SPP transfer + semester-mismatch section are **done** (Phase E): Transfer dialog on phase detail; mismatch list separate from “students without an active class”.

### Proof
- `services/accounting/accounting-sync.service.ts` + tests
- `services/classes/class.service.ts` (hooks + transfer)
- `services/classes/transfer-student-accounting.test.ts`
- `services/classes/class-status-accounting.test.ts`

---

## Task 8 — Financial adjustments + forms

**Status:** Working

### What works
- ≤1 adjustment per SPP (service + DB) (**E13**)
- Fixed / percentage validation; 100% scholarship → due 0, SPP `paid`, may close phase (**E12**)
- **Import adjustment** on SPP details: copy type/value/reason from the same student’s prior SPPs (other phases); new effective date = today; button disabled when none exist
- Form create/update tied to adjustment
- Recalc after adjustment CUD
- Blocked on cancelled phase/SPP

### Caveats / risks
- Deleting an adjustment recalculates due upward — may reopen phase; expected.
- Form is optional aid metadata; not a second money source.
- Import does not copy financial forms/invites — adjustment fields only.

### Proof
- `student-financial-adjustment.service.ts` + tests (`listImportableAdjustmentsForManager`, `importAdjustmentForManager`)
- Adjustment / form / import dialogs on `spp-details-panel.tsx`

---

## Task 9 — Status derivation engine

**Status:** Working

### What works
- SPP status derived from final due vs total paid (leave does **not** set `cancelled`; only due vs paid / manager cancel)
- Phase `closed` iff every **active** (non-cancelled) SPP is `paid`
- Recalc orchestration after payment / adjustment / phase amount edit / sync

### Caveats / risks
- Cancelled SPPs are **excluded** from “all paid → close” — correct per domain.
- Phase with zero active SPPs stays `opened` (not auto-closed).

### Proof
- `lib/manager/accounting/spp-status.ts`, `payment-phase-status.ts`, `spp-financials.ts`
- `accounting-recalc.service.ts`
- `accounting-calc.test.ts`

---

## Task 10 — Manager UX polish (Phase 6)

**Status:** Working (except print/export)

### What works
- Empty vs filtered messages; list filters/pagination; phase SPP table parity
- Links: phase → semester (+ billing class); SPP → student (`student_profile_id`); list semester links

### Deferred
- **T6.3 Print / export** — explicitly not v1

### Proof
- Plan §7 Phase 6 checklist
- Accounting UI panels under `components/manager/accounting/`

---

## Task 11 — Next-month income forecast (income analytics)

**Status:** Working

A row of three stat cards on `/manager/income-statement/analytics` estimating money arriving next month. It always covers the **real next calendar month** in `Asia/Beirut` and ignores the page's year/month filters, since a forecast for a past period is meaningless. The covered month is named in the card labels.

### How the number is built

Expected total = expected student payments + expected external credits.

**Student payments** sum, over every non-cancelled SPP with `remaining_amount > 0` on an `opened` phase whose `end_date` falls on or after the first day of next month:

- the phase `upfront_amount` when next month is the month the phase **starts in**, capped by remaining;
- otherwise `final_amount_due / duration_months`, capped by remaining.

`final_amount_due` already reflects scholarships and discounts, so adjustments need no special handling. This matches `approx_monthly_remaining` in the unpaid-students table, so the card and the table reconcile.

**External credits** are the average of the last **3 completed months** of `credit` transactions (the current, in-progress month is excluded). Credits have no recurrence data, so history is the only available signal.

### Caveats / risks
- It is an **estimate**, not committed revenue, and is labeled as such in the UI.
- No payment-cadence modeling: a student who prepaid several months ahead still contributes one installment, because only `remaining_amount` is considered.
- "First month" is a calendar-month test on `start_date`, deliberately **not** the rolling window used by `isPhaseUpfrontWindowActive` — a phase starting on the 5th belongs to that month only, so the upfront is never expected twice.
- A one-off large donation inflates the credits average for three months.

### Proof
- `lib/manager/accounting/next-month-forecast.ts` + `next-month-forecast.test.ts`
- `getNextMonthIncomeForecastForManager` in `services/accounting/income-statement-analytics.service.ts`
- `income-statement-next-month-cards.tsx`, loaded through a `Suspense` section so the SPP scan stays off the page's critical path

---

## Acceptance matrix (E1–E15) — coverage summary

| # | Working? | Notes |
|---|----------|--------|
| E1 | Yes | Unit: create seeds from in-progress members |
| E2 | Yes | Per **semester** uniqueness |
| E3 | Yes | Join sync |
| E4 | Yes | Join + reopen closed |
| E5 | Yes | No sync target when only cancelled |
| E6 | Yes | Leave keeps SPP; phase recalc (may stay open if unpaid) |
| E7 | Yes | Leave retains SPP; destination `skipPaymentSync`; optional manual SPP transfer |
| E8 | Yes | Pay full + close |
| E9 | Yes | Overpay + `has_credit` on detail DTO |
| E10 | Yes | Delete payment reopens |
| E11 | Yes | Amount upward recalc |
| E12 | Yes | 100% scholarship |
| E13 | Yes | Second adjustment rejected |
| E14 | Yes | Cancelled phase/SPP block payments |
| E15 | Yes | Missing list + repair |

**Unit suite gate (last verified):** payment-phase, accounting-sync, student-payment, student-financial-adjustment, accounting-calc, transfer-student-accounting — green.

---

## Cross-cutting risks (not bugs in happy path)

| Risk | Severity | Status |
|------|----------|--------|
| Swallowed accounting sync errors on enroll/leave | Medium | **Fixed** — audit warning + `warning` on success result + toast |
| Sticky cancelled SPP on re-enroll same phase | Medium | **Fixed** — `ensureSpp` reactivates cancelled SPP (recalc; no duplicate row) |
| Class flipped to `in_progress` without SPP backfill | Medium | **Fixed** — backfill SPPs for sync phase when status → `in_progress` |
| Multiple in-progress classes → only oldest billed | Low–Medium | **Fixed** — reject second `in_progress` class per semester |
| Live phase amount changes all SPPs | Low | By design (plan §11) — unchanged |
| No E2E / Playwright for accounting UI | Low | Still deferred — manager smoke-test manually |
| Print/export missing | N/A | Deferred T6.3 |

---

## Explicitly out of scope (v1)

From plan §9 — **not missing bugs**:

- Student-facing finance UI  
- Installment / monthly auto invoices  
- Upfront mandatory schedule enforcement  
- Payment gateways  
- Soft-delete payment history  
- Multi-currency  
- Per-student frozen amount snapshot (`original_amount_snapshot`)  

---

## Suggested follow-ups (optional, not required for v1)

1. Surface toast / audit when enroll sync fails (instead of silent catch).
2. Product rule for re-enroll after cancel: reactivate cancelled SPP vs force new phase.
3. Optional hook: class → `in_progress` triggers Missing-SPP backfill for opened phase.
4. T6.3 print/export receipts or phase summary.
5. Light E2E on create phase → pay → close.

---

## File map (quick)

| Layer | Paths |
|-------|--------|
| Plan / this report | `docs/[09] Business_logic/[9.2] Accounting/` |
| Migrations | `supabase/migrations/20260731*`, `20260801*`, `20260802*` |
| Services | `services/accounting/payment-phase.service.ts`, `student-payment.service.ts`, `student-financial-adjustment.service.ts`, `accounting-sync.service.ts`, `accounting-recalc.service.ts` |
| UI | `components/manager/accounting/*`, `app/manager/accounting/*` |
| Pure calc | `lib/manager/accounting/*` |
| Actions | `app/manager/accounting/actions.ts` |

---

## Bottom line

For the **stated manager Accounting requirements**, the feature is **working end-to-end**: semester-scoped phases, derived statuses, payments, one adjustment, enrollment sync on the in-progress class (**leave retains SPP**), transfer skip-sync, manual **SPP Transfer** + semester-mismatch / without-active-class lists, missing/repair safety net, UX polish, plus hardening for sync warnings, cancelled-SPP reactivation, one in-progress class per semester, and status→in_progress backfill.

Still deferred / by design: **print/export (T6.3)**, **live phase amount** (no per-student freeze), **no Playwright E2E**, and transfer **does not** auto-bill the destination class.
