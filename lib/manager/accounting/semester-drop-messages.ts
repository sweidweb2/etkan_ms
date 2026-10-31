import {
  PAYMENT_PHASE_STATUSES,
  STUDENT_PAYMENT_PHASE_STATUSES,
} from "@/lib/manager/accounting/constants";

/**
 * Lock / sentinel messages shared by TS mappers and SQL RPCs.
 * SQL literals in semester-drop migrations must stay in sync (covered by tests).
 */
export const SEMESTER_DROP_RPC_SENTINELS = {
  NO_SPP: "NO_SPP",
  NO_SPP_PHASE: "NO_SPP_PHASE",
} as const;

export const SPP_PAYMENT_LOCK_MESSAGES = {
  PHASE_CANCELLED: "Cannot record payments on a cancelled payment phase.",
  SPP_CANCELLED: "Cannot record payments on a cancelled student assignment.",
  SPP_PAID: "Cannot record payments on a paid student assignment.",
  DROP_COMPLETED: "Cannot record payments on a completed semester drop.",
} as const;

export const SPP_ADJUSTMENT_LOCK_MESSAGES = {
  PHASE_CANCELLED: "Cannot change adjustments on a cancelled payment phase.",
  SPP_CANCELLED: "Cannot change adjustments on a cancelled student assignment.",
  DROP_COMPLETED: "Cannot change adjustments on a completed semester drop.",
} as const;

export const DROP_REFUND_AMOUNT_SQL_MESSAGE =
  "Refund amount must be greater than 0 and at most the remaining refund owed.";

export function isNoSppDropFallbackMessage(message: string): boolean {
  return (
    message.includes(SEMESTER_DROP_RPC_SENTINELS.NO_SPP) ||
    message.includes(SEMESTER_DROP_RPC_SENTINELS.NO_SPP_PHASE)
  );
}

export function adjustmentBlockedMessage(input: {
  phaseStatus: string | null | undefined;
  sppStatus: string | null | undefined;
  dropCompleted: boolean;
}): string | null {
  if (input.phaseStatus === PAYMENT_PHASE_STATUSES.CANCELLED) {
    return SPP_ADJUSTMENT_LOCK_MESSAGES.PHASE_CANCELLED;
  }
  if (input.sppStatus === STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED) {
    return SPP_ADJUSTMENT_LOCK_MESSAGES.SPP_CANCELLED;
  }
  if (input.dropCompleted) {
    return SPP_ADJUSTMENT_LOCK_MESSAGES.DROP_COMPLETED;
  }
  return null;
}
