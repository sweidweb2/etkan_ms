import { SEMESTER_DROP_DEFAULT_REQUIRED_PERCENT } from "@/lib/manager/accounting/constants";

/**
 * Drop money formula mirrors.
 *
 * Authoritative implementations run inside Postgres RPCs (atomic create /
 * complete / refund). Keep these in sync with:
 * - `create_semester_drop_request` (required %, deadline = start + 2 months)
 * - `complete_semester_drop_request` (settlement adjustment, refund_owed)
 * Migrations: `20261031150000_semester_drop_requests.sql`,
 * `20261031160000_drop_adjusted_required_and_spp_locks.sql`.
 *
 * Use these helpers for previews, docs, and unit tests — not as a second
 * write path.
 */

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Drop required amount = adjusted final due × percent.
 * Pass `final_amount_due` (phase amount after financial adjustments), not raw phase price.
 */
export function computeDropRequiredAmount(
  finalAmountDue: number,
  requiredPercent: number = SEMESTER_DROP_DEFAULT_REQUIRED_PERCENT
): number {
  const amount = Math.max(0, Number(finalAmountDue) || 0);
  const percent = Math.min(100, Math.max(0, Number(requiredPercent) || 0));
  return roundMoney((amount * percent) / 100);
}

/** phase.start_date + 2 calendar months (date-only). */
export function computeDropDeadlineAt(phaseStartDate: string): string {
  const [y, m, d] = phaseStartDate.split("-").map(Number);
  if (!y || !m || !d) {
    return phaseStartDate;
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCMonth(date.getUTCMonth() + 2);
  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function computeDropRefundOwed(
  totalPaid: number,
  requiredAmount: number
): number {
  return roundMoney(
    Math.max(0, (Number(totalPaid) || 0) - (Number(requiredAmount) || 0))
  );
}

/** Settlement fixed adjustment so final due becomes required (phase.amount − required). */
export function computeDropSettlementAdjustment(
  phaseAmount: number,
  requiredAmount: number
): number {
  return roundMoney(
    Math.max(0, (Number(phaseAmount) || 0) - (Number(requiredAmount) || 0))
  );
}
