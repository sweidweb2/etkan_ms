import type { ManagerSppFinancialSnapshot } from "@/types/manager-student-payment";

/** Apply server post-recalc SPP money fields (idempotent; no client recompute). */
export function applySppFinancialSnapshot<
  T extends {
    status: ManagerSppFinancialSnapshot["status"];
    original_amount: number;
    adjustment_amount: number;
    final_amount_due: number;
    total_paid: number;
    remaining_amount: number;
    has_credit?: boolean;
  },
>(current: T, snapshot: ManagerSppFinancialSnapshot): T {
  const next: T = {
    ...current,
    status: snapshot.status,
    original_amount: snapshot.original_amount,
    adjustment_amount: snapshot.adjustment_amount,
    final_amount_due: snapshot.final_amount_due,
    total_paid: snapshot.total_paid,
    remaining_amount: snapshot.remaining_amount,
  };

  if ("has_credit" in current) {
    next.has_credit = snapshot.remaining_amount < 0;
  }

  return next;
}
