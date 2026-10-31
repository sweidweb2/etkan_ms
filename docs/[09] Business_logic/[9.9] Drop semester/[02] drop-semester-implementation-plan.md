# [02] Drop semester — implementation plan

**Status:** Implemented in repo (apply migrations + smoke)  
**Source of truth:** `[01] drop-semester-locked-decisions.md`

No queue. No cron. Event-driven only.

## Permissions

| Key | Label | Access |
|-----|-------|--------|
| `classes.drop_semester` | Drop semester for class student | write |
| `accounting.drop_refunds.process` | Process drop semester refund | write |

## Schema

- `semester_drop_requests` — drop lifecycle
- `student_payments.type` — `credit` \| `debit`
- `student_payments.semester_drop_request_id` — FK for refund debits

## SQL RPCs

| RPC | Role |
|-----|------|
| `create_semester_drop_request` | Create pending; auto-complete if paid ≥ required |
| `cancel_semester_drop_request` | Cancel pending only |
| `complete_semester_drop_request` | Settle due, leave class, withdrawn, refund_owed |
| `try_complete_semester_drop_for_spp` | After payment recalc |
| `create_student_payment_debit_for_drop_refund` | Debit refund + update owed |

Recalc: `total_paid = sum(credits) − sum(debits)`.

## App layers

- Domain: `lib/manager/accounting/spp-financials.ts` net payments; drop helpers/constants
- Repos: `semester-drop-request.repository.ts`; payment/semester extensions
- Services: create/cancel drop; process refund; payment hook; transfer block; rejoin; exceptions `needRefund`
- UI: class Drop/Stop/Pending; Need refund tab; SPP Dropped/Done paid/Refund overlays

## Settlement on complete

Upsert SPP adjustment: fixed `phase.amount − required_amount`, type `manual_adjustment`, reason `Semester drop settlement`.

## Smoke checklist

1. `npx supabase db push` (permissions + drop schema migrations)
2. Class detail → Drop semester (custom %) → Pending badge; transfer disabled
3. Record payment until ≥ required → student leaves class; SPP kept; Dropped + Done paid; semester withdrawn
4. If paid above required → Need refund tab → Mark refunded → SPP net paid decreases; analytics debit
5. Stop pending drop; rejoin after completed drop → semester active; badges hidden while member
6. Remove student still works separately from Drop
