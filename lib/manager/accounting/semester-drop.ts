import {
  SEMESTER_DROP_DEFAULT_REQUIRED_PERCENT,
  SEMESTER_DROP_RESTRICTION_MODES,
  type SemesterDropRestrictionMode,
} from "@/lib/manager/accounting/constants";

/**
 * Drop money formula mirrors.
 *
 * Authoritative implementations run inside Postgres RPCs (atomic create /
 * complete / refund). Keep these in sync with:
 * - `create_semester_drop_request` (percent | amount | none)
 * - `complete_semester_drop_request` (settlement; none → due=total_paid, no refund)
 * - leave all scheduled/in_progress semester classes
 * Migrations: `20261031150000_semester_drop_requests.sql`,
 * `20261031160000_drop_adjusted_required_and_spp_locks.sql`,
 * `20261127232000_semester_drop_leave_all_active_classes.sql`,
 * `20261127235100_semester_drop_restriction_modes.sql`.
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

export function resolveDropRestriction(input: {
  mode: SemesterDropRestrictionMode;
  requiredPercent?: number | null;
  requiredAmount?: number | null;
  finalAmountDue: number;
}): {
  mode: SemesterDropRestrictionMode;
  requiredPercent: number | null;
  requiredAmount: number;
} {
  const finalDue = Math.max(0, Number(input.finalAmountDue) || 0);
  const mode = input.mode;
  const percent =
    input.requiredPercent == null ? null : Number(input.requiredPercent);
  const amount =
    input.requiredAmount == null ? null : Number(input.requiredAmount);

  if (mode === SEMESTER_DROP_RESTRICTION_MODES.PERCENT) {
    if (percent == null || percent === 0) {
      return { mode: SEMESTER_DROP_RESTRICTION_MODES.NONE, requiredPercent: null, requiredAmount: 0 };
    }
    return {
      mode: SEMESTER_DROP_RESTRICTION_MODES.PERCENT,
      requiredPercent: percent,
      requiredAmount: computeDropRequiredAmount(finalDue, percent),
    };
  }

  if (mode === SEMESTER_DROP_RESTRICTION_MODES.AMOUNT) {
    if (amount == null || amount === 0) {
      return { mode: SEMESTER_DROP_RESTRICTION_MODES.NONE, requiredPercent: null, requiredAmount: 0 };
    }
    return {
      mode: SEMESTER_DROP_RESTRICTION_MODES.AMOUNT,
      requiredPercent: null,
      requiredAmount: roundMoney(Math.min(Math.max(0, amount), finalDue)),
    };
  }

  return {
    mode: SEMESTER_DROP_RESTRICTION_MODES.NONE,
    requiredPercent: null,
    requiredAmount: 0,
  };
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
  requiredAmount: number,
  mode: SemesterDropRestrictionMode = SEMESTER_DROP_RESTRICTION_MODES.PERCENT
): number {
  if (
    mode === SEMESTER_DROP_RESTRICTION_MODES.NONE ||
    (Number(requiredAmount) || 0) === 0
  ) {
    return 0;
  }
  return roundMoney(
    Math.max(0, (Number(totalPaid) || 0) - (Number(requiredAmount) || 0))
  );
}

/**
 * Settlement fixed adjustment so final due becomes the target.
 * none → target = totalPaid; otherwise target = requiredAmount.
 */
export function computeDropSettlementAdjustment(
  phaseAmount: number,
  targetAmount: number
): number {
  return roundMoney(
    Math.max(0, (Number(phaseAmount) || 0) - (Number(targetAmount) || 0))
  );
}
