# [01] Drop semester — locked decisions

**Project:** Etkan MS  
**Status:** Decisions locked — ready for implementation plan  
**Related:**  
- `docs/[10] Plans/[01] student-class-binary-membership-and-spp-transfer.md`  
- `docs/[09] Business_logic/[9.2] Accounting/`  

---

## 0. Glossary (what “complete” means)

| Term | Entity / table | Meaning |
|------|----------------|---------|
| **Drop request** | New table (e.g. `semester_drop_requests`) | One row per drop attempt for a student + semester |
| **Pending** | `semester_drop_requests.status = pending` | Drop started; student still in class |
| **Complete / completed** | `semester_drop_requests.status = completed` | Money gate met → membership removed, SPP kept, badges set, refund calc run |
| **Cancelled / stopped** | `semester_drop_requests.status = cancelled` | Manager stopped drop **before** any pipeline side effects (see §6) |
| **SPP** | `student_payment_phases` | Student’s bill on a payment phase |
| **Payment (in)** | `student_payments` type **credit** | Student paid school |
| **Payment (refund)** | `student_payments` type **debit** | School refunded student; counts in analytics debits |
| **`refund_owed`** | Column on **`semester_drop_requests`** | Set when request **completes** if paid &gt; required; cleared/reduced when debit refunds are recorded |

**“Complete” always means the drop-request row**, not the SPP and not the class row.

---

## 1. Intent

Manager marks that a student wants to **drop this semester** from class details.

- Roster shows **Pending drop** until paid ≥ required %.
- When gate met → drop request **completes** → leave class, keep SPP, badges, maybe Need refund.
- Exceptions **Need refund** → mark refunded amount X → **`student_payments` debit** → SPP `total_paid` nets down; analytics see the debit.

---

## 2. Non-negotiables

| # | Locked |
|---|--------|
| 1 | `student_class` stays **binary**. No class status column. |
| 2 | Drop lifecycle lives on **`semester_drop_requests`**, not class/SPP status enums. |
| 3 | On drop **complete**: delete `student_class` row; **keep** SPP + payment history. |
| 4 | **Remove ≠ Drop.** Both stay. |
| 5 | Grades / attendance / tasks: **same as leave** (kept). |
| 6 | Overpay Credit/Refund badges (`remaining < 0` vs full phase) stay separate from **drop refund**. |

---

## 3. Lifecycle (`semester_drop_requests`)

| Status | Class roster | SPP | Drop request fields |
|--------|--------------|-----|---------------------|
| `pending` | Listed + **Pending drop** | Still exists | Waiting for `total_paid ≥ required_amount` |
| `completed` | Membership **deleted** | Kept; due settled to required (see §4) | `completed_at` set; maybe `refund_owed` |
| `cancelled` | Normal member | Unchanged | Only if stop allowed (see §6) |

**Auto-complete trigger:** after payment/recalc, if pending request and `SPP.total_paid ≥ required_amount` → transition request → `completed` (leave class, badges, refund_owed).

---

## 4. Money rules

| # | Rule |
|---|------|
| 1 | Base = **`payment_phases.amount`**. |
| 2 | Default required % = **50** (manager input at create, editable then only). |
| 3 | `required_amount = phase.amount × required_percent / 100` (snapshot on request). |
| 4 | Window reference = **`phase.start_date + 2 months`** (`deadline_at`). Informational; **does not auto-fail**. |
| 5 | After window, manager can still create drop with **custom %**. |
| 6 | Paid &lt; required → stay **`pending`** on roster. |
| 7 | Paid ≥ required → **complete** drop request. |
| 8 | On **complete**: if `total_paid > required_amount` →  
    `refund_owed = total_paid − required_amount` on **drop request**; `refund_status = owed`. |
| 9 | On **complete**: settle SPP obligation to the drop fee —  
    **`final_amount_due` becomes `required_amount`** (via adjustment or equivalent), then recalc.  
    Example: phase 100, required 50, paid 70 → due 50, paid 70 → refund_owed 20; badges Dropped + Done paid + Refund. |
| 10 | No SPP → **immediate remove** from class (no drop request). |
| 11 | % applies to the phase for the **semester being dropped**. |

### Example (locked)

```text
Phase amount = 100
Required %   = 50  → required_amount = 50
Student paid = 70  (credits on student_payments)

Drop request completes:
  - delete student_class
  - SPP final_amount_due = 50
  - refund_owed = 20 on semester_drop_requests
  - badges: Dropped, Done paid, Refund
  - student_semester.status = withdrawn

Manager marks refund 20:
  - insert student_payments debit amount 20 on that SPP
  - recalc: total_paid = 70 − 20 = 50
  - refund_owed → 0 / refund_status = processed
  - SPP shows paid 50 / due 50
```

---

## 5. Refunds

| # | Rule |
|---|------|
| 1 | `refund_owed` lives on **`semester_drop_requests`**, set at **complete**. |
| 2 | Exceptions tab **Need refund** = completed requests with `refund_status = owed` (and owed &gt; 0). |
| 3 | Mark refunded (amount X) → insert **`student_payments` row with type `debit`** on that SPP. |
| 4 | Debits appear in **income-statement / analytics** like other money-out. |
| 5 | Recalc SPP: `total_paid = sum(credits) − sum(debits)` (net). |
| 6 | After debit(s) cover `refund_owed` → `refund_status = processed`; clear Need refund. |
| 7 | **Impl note:** today `student_payments` is amount ≥ 0 with **no** credit/debit type (workshop payments already have type). Migration must add **`type`** (`credit` default for existing rows, `debit` for refunds) and change SPP sum + income-statement aggregation accordingly. |

---

## 6. Cancel / stop / edit / transfer / rejoin

| # | Rule |
|---|------|
| 1 | **No edit %** after create. |
| 2 | **Stop/cancel** pending drop only if **no pipeline operations happened** yet (no complete, no leave, no refund). Effect: status `cancelled`; badge gone; transfer allowed again. |
| 3 | **No class transfer** while drop `pending`. |
| 4 | **Rejoin** after `completed` drop: allowed; **reuse same SPP**; keep net paid; clear drop display badges for active billing; `student_semester` → **`active`**; completed request kept as history. |
| 5 | On drop **complete**: `student_semester.status` → **`withdrawn`**. |
| 6 | Past deadline + still under %: **stay pending** (no auto-fail). |
| 7 | One **`pending`** drop per student+semester. |
| 8 | New RBAC permissions when implementing (names in impl plan + permission-definitions). |

---

## 7. UI

| Surface | Behavior |
|---------|----------|
| Class details → per student | **Drop semester** → % input (default 50) → create `pending` request |
| Class roster | **Pending drop** badge while `pending` |
| On complete | Student removed from class list |
| Stop | Available on pending with no pipeline ops |
| SPP row | **Dropped**, **Done paid**, **Refund** (owed) |
| Accounting → Exceptions | Tab **Need refund** |
| Need refund row | Mark refunded X → `student_payments` debit |

---

## 8. Data model

### `semester_drop_requests` (name final in migration)

| Field | Purpose |
|-------|---------|
| `id` | PK |
| student + `semester_id` | Scope |
| `class_id` | Snapshot |
| `payment_phase_id`, `spp_id` | Billing target |
| `status` | `pending \| completed \| cancelled` |
| `required_percent` | Manager % at create |
| `required_amount` | Snapshot fee |
| `phase_amount_snapshot` | Phase amount at create |
| `requested_at` | Create time |
| `deadline_at` | `phase.start_date + 2 months` |
| `completed_at` | When status → completed |
| `refund_owed` | Set at complete; reduced as debits applied |
| `refund_status` | `none \| owed \| processed` |
| `refunded_amount` | Sum of processed refund debits for this request |
| `requested_by`, notes | Audit |

### `student_payments` (extend)

| Change | Purpose |
|--------|---------|
| Add `type` `credit \| debit` | In = credit (default); refund = debit |
| Recalc / analytics | Net credits − debits for SPP; debits in analytics |

### Unchanged

- No `student_class.status`
- SPP status enum stays money-derived (`pending \| partially_paid \| paid \| cancelled`)

---

## 9. Open items — closed

| ID | Decision |
|----|----------|
| O1 | On drop **complete**: set SPP **`final_amount_due = required_amount`**, then recalc. |
| O2 | Refund = **`student_payments` debit** (same table as pays); analytics include it. |
| O3 | Debit **reduces** SPP net `total_paid` (70 → 50 after refund 20). |
| O4 | No auto-fail; stay pending; enforce + custom % always allowed. |
| O5 | % create-only; stop/cancel only if no pipeline ops yet. |
| O6 | Manager can cancel under O5 rules. |
| O7 | Rejoin: reuse SPP, clear drop badges, semester `active`, history kept. |
| O8 | `refund_owed` set on **`semester_drop_requests` at complete**; not a column on SPP. Frozen at complete for the owed amount; reduced by debit refunds. |
| O9 | One pending per student+semester. |
| O10 | Add permissions in impl. |

**O11 (naming only):** pick exact table name in migration (`semester_drop_requests` preferred).

---

## 10. Readiness

| Area | Ready? |
|------|--------|
| Product + lifecycle | Yes |
| Money % / window / complete / refund_owed | Yes |
| Payment debit + SPP net | Yes (needs schema extend) |
| UI / exceptions | Yes |
| Binary membership | Yes |

**Verdict:** Locked. Next step = implementation plan (phases, migration, services, RBAC), then build.

---

## 11. Impl watch-outs (not re-opening product)

1. Extend `student_payments` + all sum/recalc paths that assume credit-only / `amount > 0` only.
2. Income-statement currently sums student payments as inflow — debit rows must move to **debits**.
3. Define “no pipeline ops” precisely for cancel: e.g. status still `pending` and no debit refunds linked (complete already forbids cancel).
4. Partial mark-refund (refund 10 of 20 owed) — support running `refunded_amount` until owed covered.
