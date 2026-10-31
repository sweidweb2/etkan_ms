import { SEMESTER_DROP_DEFAULT_REQUIRED_PERCENT } from "@/lib/manager/accounting/constants";

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function computeDropRequiredAmount(
  phaseAmount: number,
  requiredPercent: number = SEMESTER_DROP_DEFAULT_REQUIRED_PERCENT
): number {
  const amount = Math.max(0, Number(phaseAmount) || 0);
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

export function computeDropSettlementAdjustment(
  phaseAmount: number,
  requiredAmount: number
): number {
  return roundMoney(
    Math.max(0, (Number(phaseAmount) || 0) - (Number(requiredAmount) || 0))
  );
}
