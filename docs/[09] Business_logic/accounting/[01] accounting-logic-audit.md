# [01] Accounting business logic audit

**Project:** Etkan MS (`etkan_ms`)  
**Date:** 2026-07-12  
**Scope:** Manager accounting — accounts, subscribed semesters, payments, scheduled payments, special cases, alerts, class/semester reassignment  
**Purpose:** End-to-end scan of flows, gates, and edge cases; call out what works, what is inconsistent, and what is missing.

---

## Executive summary

Accounting mutations are largely coherent: payment create/edit/delete, remaining-due caps (including active special cases), and auto `paid` ↔ `pending` sync are wired through service + UI. Scheduled payments and special cases are create/update only.

P1 display inconsistencies (list/financial owed, detail alerts, tab dots) were fixed on 2026-07-12. Remaining reliability risks include **status sync gaps** after amount/special-case changes without payment mutations, and **class semester reassignment** leaving orphan subscriptions / mismatched special cases.

| Area | Verdict |
|------|---------|
| Payment create / amount cap / auto-paid | Working |
| Payment edit / delete / reopen to pending | Working |
| Schedule create/update locks | Working (no delete) |
| Special-case owed in mutation gate | Working |
| Manual subscription status (no manual `paid`) | Working |
| List / overview `balance_due` vs special case | **Done** (special-case aware) |
| Detail financial "Total due" vs payment remaining | **Done** (special-case aware) |
| Detail vs list payment alerts | **Done** (account-wide open count) |
| Tab status dots (pending/paid/paused/stopped/refunded) | **Done** |
| Special-case / schedule delete | Missing (by design today) |
| Concurrent overpay race | Unhandled |

---

## 1. Domain model

### Core entities

| Entity | Table | Notes |
|--------|-------|-------|
| Account | `accounts` | One per student user |
| Subscribed semester | `subscribed_semesters` | Billing row per account + semester |
| Payment | `payments` | Real money; drives paid/pending sync |
| Scheduled payment | `scheduled_payments` | Informational reminders only |
| Special case | `account_special_cases` | Optional owed override per account+semester |

### Status lifecycles

**Subscribed semester:** `pending | paid | paused | stopped | refunded`  
(`lib/constants/manager-subscribed-semester-status.ts`, migration `20260718000000_subscribed_semester_status_lifecycle.sql`)

| Status | Open for alerts? | Create payment? | Edit/delete payment? | Schedules? |
|--------|------------------|-----------------|----------------------|------------|
| `pending` | Yes | If remaining due &gt; 0 | Yes | If not fully paid |
| `paid` | No | No | Yes | No |
| `paused` / `stopped` / `refunded` | No | No | No | No |

**Special case:** `active | inactive`; types `scholarship | done`  
**Scheduled:** `scheduled | reminded | completed | missed | cancelled`

### Owed amount rule (mutations + detail payment UI)

```
owed = active special_case.total_amount  if active special exists for account+semester
     = subscribed_semesters.amount       otherwise
remainingDue = max(owed - sum(payments), 0)
```

Implemented in `lib/manager/subscribed-semester-billing.ts` → `getSubscriptionBillingGate`.

---

## 2. Happy paths (working)

### 2.1 Ensure / load account

1. `getStudentAccountForManager` / `listAccountingStudentsForManager` ensure a subscription exists for each enrollment (`ensureSubscribedSemesterForAccount`).
2. New rows default to `pending` with `semester.amount`.
3. Also triggered from enroll / add-to-class / connect-class flows.

### 2.2 Create payment

1. Manager only; amount must be &gt; 0.
2. Gate: `canCreatePayments` → status `pending` **and** `remainingDue > 0`.
3. Cap: `amount <= remainingDue` (special-case aware).
4. Insert → `syncSubscriptionPaidStatus`: if total paid ≥ owed → `paid`.
5. Audit log + toast.

### 2.3 Update payment

1. Gate: `canEditPayments` → `pending` **or** `paid`.
2. Cap excludes current payment id (`remainingDue` after exclude = room for this row).
3. Sync: ≥ owed → `paid`; &lt; owed while was `paid` → `pending`.
4. UI max = `remainingDue + payment.amount` (matches service).

### 2.4 Delete payment

1. Same edit gate.
2. Delete → recompute paid; may reopen `paid` → `pending`.
3. Confirm dialog + `deletePaymentAction` wired.

### 2.5 Scheduled payments

1. Create/update only when `pending` and not fully paid.
2. Do not change subscription status or payment totals.
3. UI also requires `balanceDue > 0` for Add (aligned in practice with remaining due).

### 2.6 Special case create/update

1. Unique `(account_id, semester_id)`.
2. Discount derived from catalog semester amount vs special `total_amount`.
3. If `total_amount === 0` → `markSubscribedSemesterPaidForAccount` (force `paid`).
4. Active special lowers owed for payment gates and detail payment dialogs.

### 2.7 Manual subscription edit

1. Amount always editable (must be &gt; 0).
2. Status dropdown: pending / paused / stopped / refunded only.
3. If already `paid`, status is read-only; service rejects leaving `paid` or entering `paid` manually.

---

## 3. Mutation gate matrix

Source of truth: `getSubscriptionBillingGate` in `lib/manager/subscribed-semester-billing.ts`.

| Flag | Rule |
|------|------|
| `canCreatePayments` | `pending && remainingDue > 0` |
| `canEditPayments` / `canDeletePayments` | `pending \|\| paid` |
| `canMutateSchedules` | `pending && !isFullyPaid` |

| Scenario | Create | Edit/Delete | Schedules |
|----------|--------|-------------|-----------|
| Pending, balance left | ✓ | ✓ | ✓ |
| Pending, fully paid (remaining 0) | ✗ | ✓ | ✗ |
| Paid, remaining 0 | ✗ | ✓ | ✗ |
| Paused / stopped / refunded | ✗ | ✗ | ✗ |

**Note:** Deprecated alias `canMutatePayments` equals create-only — do not use for edit UI.

---

## 4. Auto status sync (`syncSubscriptionPaidStatus`)

Called after payment create / update / delete in `services/accounting.service.ts`.

| After mutation | Effect |
|----------------|--------|
| `totalPaid >= owed` | Set `paid` (no-op if already) |
| `totalPaid < owed` and status was `paid` | Set `pending` |
| Underpaid but `paused` / `stopped` / `refunded` | **Leave unchanged** |

Owed uses active special-case total when present.

---

## 5. Alerts

Resolver: `resolveManageAccountingAlert` (`lib/constants/manager-accounting-payment-alert.ts`).

Cron digest was removed (`20260717000000_drop_cron_notify_manager_payment_alerts.sql`). Alerts are **derived UI state only**.

### Rules (single open subscription)

| Condition | Reasons |
|-----------|---------|
| `openBillingCount <= 0` | None |
| `openBillingCount > 1` | `complex` |
| Active special fully covered | `done` (`payment_alert: false`) |
| Active special incomplete + schedules | `scheduled` / `missed_schedule` |
| Active special incomplete, no schedules | L1–L6 from last `paid_at` |
| No special + paid &lt; $100 | `low_payment` (+ schedule or L1–L6) |

Open billing = status `pending` (unknown statuses also count as open).

Missed-month window: payments on day **1–30** of the current month suppress L-levels; day **31** does not count as “this month.”

---

## 6. Findings — broken or inconsistent

### P1 — High impact

#### 6.1 List / overview balance ignores special-case owed

**Status: Done (2026-07-12).** `getSubscriptionBilling` / `getAccountBillingTotals` now use `getSubscriptionBillingGate` (active special-case owed).

`getSubscriptionBilling` / `getAccountBillingTotals` in `accounting.service.ts` compute:

```
balance_due = subscription.amount - payments
```

Mutations and detail payment UI use special-case owed. A scholarship student can show list **Balance due &gt; 0** while payment remaining is **0**, and “Paid in full” filters can disagree with create-payment locks.

**Affects:** manage list stats, row `balance_due`, account overview totals.

#### 6.2 Detail financial summary ignores special-case owed

**Status: Done (2026-07-12).** `getSubscribedSemesterFinancialStats` accepts active special-case total; financial section passes it from the tab.

`getSubscribedSemesterFinancialStats` uses `subscription.amount − paid_amount` only. Same tab’s payment dialog uses gated `owedAmount` / `remainingDue`. Progress % and “Total due” can contradict the Add payment summary.

#### 6.3 Detail alerts vs list alerts

**Status: Done (2026-07-12).** Detail tabs receive account-wide `openBillingCount` and list-matching `isFocusOpenSubscription`.

| | List | Detail tab |
|--|------|------------|
| `openBillingCount` | All open subs on the account | Always 0 or 1 for **this** tab |
| Focus | Only the single open semester row | Always focused |

Two pending subscriptions → list shows **Complex**; each detail tab shows per-sub low/L/schedule alerts instead.

#### 6.4 Subscription tab status dots use obsolete statuses

**Status: Done (2026-07-12).** Tab dots map `pending|paid|paused|stopped|refunded`.

In `student-account-details-panel.tsx`, dots check `"active"` / `"overdue"`. Real statuses are `pending|paid|paused|stopped|refunded`. Dots almost always muted gray; only accidental matches (none for overdue).

### P2 — Medium

#### 6.5 Raising subscription amount while `paid` does not reopen

**Status: Done (2026-07-12).** `updateSubscribedSemesterForManager` now syncs paid/pending after amount changes.

`updateSubscribedSemesterForManager` does **not** call `syncSubscriptionPaidStatus`. Increasing amount under `paid` can leave remaining due &gt; 0 with create still blocked (not `pending`) and no open-billing alert.

#### 6.6 Special-case changes incompletely sync status

**Status: Done (2026-07-12).** Special create/update always runs billing sync (active zero, covered payments, deactivate/reopen).

| Change | Behavior |
|--------|----------|
| `total_amount === 0` | Forces `paid` (even if special is **inactive**) |
| Raise amount from 0 / deactivate scholarship | Does **not** revert to `pending` |
| Create special with owed already covered by payments | Does **not** auto-mark `paid` (only the zero path) |

#### 6.7 Catalog vs subscription amount drift

**Status: Done (2026-07-12).** Discount persist and list alert `semesterAmount` use subscription amount.

- Special-case discount persisted from **`semesters.amount`**.
- UI discount preview often uses **`subscription.amount`**.
- List alerts use catalog amount; detail alerts use subscription amount → “done” coverage can disagree.

#### 6.8 `special_case_no_money` never shown

**Status: Done (2026-07-12).** Manage list shows special-case badges in Alert only while `balance_due > 0`. `special_case_no_money` is scholarship + zero paid + special total &gt; 0 (not 100% scholarships). Detail no longer labels full scholarships as “No money.”

Service sets `special_case_no_money` (active scholarship + zero paid). `AccountingSpecialCaseAlertBadge` exists but is unused on list/detail.

#### 6.9 Schedule empty-state copy wrong when locked for non-paid reasons

**Status: Done (2026-07-12).** Empty copy uses lock message when status-locked; fully-paid copy only when remaining is zero.

When paused/stopped with zero schedules, empty copy can imply “fully paid subscription” even when the lock reason is “not pending.”

#### 6.10 Informational reasons in alert chrome

**Status: Done (2026-07-12).** Detail alert box uses emerald for `done`, slate for `scheduled`, amber for attention reasons.

`done` and `scheduled` appear in the same amber “Payment alert” UI as attention reasons, despite `payment_alert: false` for `done`.

### P3 — Lower / operational

#### 6.11 No transactional payment + status update

**Status: Done (2026-07-12).** Create/update/delete compensate on sync failure (delete new payment / restore previous / re-create deleted).

If status sync fails after insert/update/delete, the payment change can be committed while the API returns an error (“Payment recorded, but subscription status could not be updated”).

#### 6.12 Concurrent payment race

**Status: Done (2026-07-12).** Post-insert overshoot check deletes the new payment and returns an amount field error (no DB lock yet).

Two creates can both pass the remaining-due check and overshoot owed (no DB constraint on sum of payments).

#### 6.13 Zero special case overrides closed statuses

**Status: Done (2026-07-12).** `markSubscribedSemesterPaidForAccount` only promotes from `pending`; paused/stopped/refunded/paid are no-ops.

`markSubscribedSemesterPaidForAccount` can set paused/stopped/refunded → `paid`.

#### 6.14 Class semester reassignment side effects

**Status: Done (2026-07-12).** When next sub exists: update amount + sync paid/pending; leftover previous `pending` → `stopped`. Repoint previous→next then sync. Special cases stay semester-keyed (intentional; not migrated).

`reassignClassStudentsSubscribedSemesters` / `reassignAccountSubscribedSemester`:

- If next semester sub already exists → keeps both (old left behind) → possible **complex** alerts.
- Payments stay on the subscription row when semester is repointed.
- Special cases stay keyed by **semester_id** and may not follow.
- Status is kept when amount updates — a `paid` row moved to a higher-priced semester stays `paid` without re-check.

#### 6.15 Scheduled amounts not capped to remaining due

**Status: Done (2026-07-12).** Service rejects schedule amount &gt; remaining due; add/edit UI uses `max` + client check. Empty amount still allowed.

Reminders can sum above owed; informational only but confusing in UI.

#### 6.16 No delete for schedules or special cases

**Status: Done (intentional, 2026-07-12).** No delete APIs; cancel schedule / set special case inactive remains the supported path.

Must cancel / set inactive instead of remove. Consistent across repo, service, and UI — intentional gap for now.

#### 6.17 Missing account blocks billing ensure

**Status: Done (2026-07-12).** `ensureSubscribedSemesterForStudent` creates the account when missing, then ensures the subscription.

Enrollment paths that lack an account skip subscription creation; accounting list may show the student without a billable row until an account exists.

---

## 7. Edge cases checklist

| Case | Expected / actual |
|------|-------------------|
| Create when fully paid | Blocked (UI + service) |
| Edit when paid | Allowed; capped to current amount if remaining 0 |
| Edit down below owed while paid | Status → `pending` |
| Delete last covering payment while paid | Status → `pending` |
| Edit/delete when paused | Blocked |
| Active special lowers owed | Mutation + detail payment UI yes; list/financial no |
| Special `total_amount = 0` | Force paid; create/schedules blocked |
| Manual set status to `paid` | Rejected |
| Leave `paid` via dropdown | UI locked + service reject |
| Payment amount 0 | Zod rejects |
| Subscription amount 0 | Validator rejects (&gt; 0) |
| Day-31 payment in current month | Does not clear L-level “this month” window |
| Multiple pending subs | List: complex; detail: per-tab alerts |

---

## 8. What is intentionally out of scope today

- Scheduled payment delete
- Special case delete
- DB-level sum(payment) ≤ owed constraint
- Cron / email payment-alert digests (removed)
- Student-facing billing UI

---

## 9. Recommended fix order

1. **Unify owed amount** — one helper for list `balance_due`, overview totals, financial stats, and mutation gate (always special-case aware when active).
2. **Fix detail alerts** — pass account-wide `openBillingCount` + focus flags into the tab panel (same inputs as list).
3. **Fix tab status dots** — map `pending|paid|paused|stopped|refunded`.
4. **Sync status after subscription amount / special-case changes** — call the same paid/pending sync (or equivalent) when owed or paid coverage changes without a payment mutation.
5. **Show or drop `special_case_no_money`** — wire the badge or stop computing the flag.
6. **Harden reassignment** — document/decide: merge vs leave old sub; move or recreate special cases; re-evaluate `paid` after amount change.
7. **Optional:** wrap payment + status sync in a DB transaction; consider schedule amount hints vs remaining due.

---

## 10. Key file map

| Concern | Path |
|---------|------|
| Mutations | `services/accounting.service.ts` |
| Billing gate | `lib/manager/subscribed-semester-billing.ts` |
| Ensure / reassign / mark paid | `services/subscribed-semester.service.ts` |
| Alerts | `lib/constants/manager-accounting-payment-alert.ts` |
| Financial stats (detail) | `lib/manager/get-subscribed-semester-financial-stats.ts` |
| Actions | `app/manager/accounting/actions.ts` |
| Detail UI | `components/manager/accounting/student-account-details-panel.tsx` |
| Payments UI | `components/manager/accounting/subscribed-semester-payments-section.tsx` |
| Schedules UI | `components/manager/accounting/scheduled-payments-section.tsx` |
| List UI | `components/manager/accounting/manage-accounting-panel.tsx` |
| Status lifecycle migration | `supabase/migrations/20260718000000_subscribed_semester_status_lifecycle.sql` |

---

## 11. Test coverage snapshot

Covered well in `services/accounting.service.test.ts` and `lib/manager/subscribed-semester-billing.test.ts`:

- Create lock (not pending / fully paid / over remaining)
- Create → auto `paid`
- Edit amount cap (normal + special case)
- Edit reduce → `paid` → `pending`
- Delete blocked when paused; delete underpay → `pending`
- Manual subscription status rules for `paid`
- Schedule create/update locks

Not covered (gaps for follow-up tests): list vs special-case balance, amount-edit without payment sync, special-case deactivate reopen, reassignment orphans, concurrent overpay.
