import { ACCOUNT_SPECIAL_CASE_STATUSES } from "@/lib/constants/manager-account-special-case";
import { SUBSCRIBED_SEMESTER_STATUSES } from "@/lib/constants/manager-subscribed-semester-status";

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export type SubscriptionBillingGateInput = {
  status: string | null | undefined;
  subscriptionAmount: number;
  totalPaid: number;
  activeSpecialCaseTotalAmount?: number | null;
};

export type SubscriptionBillingLockReason =
  | "not_pending"
  | "fully_paid"
  | "status_locked"
  | null;

export type SubscriptionBillingGate = {
  owedAmount: number;
  totalPaid: number;
  remainingDue: number;
  isPending: boolean;
  isPaid: boolean;
  isFullyPaid: boolean;
  canCreatePayments: boolean;
  canEditPayments: boolean;
  canDeletePayments: boolean;
  canMutateSchedules: boolean;
  /** @deprecated Prefer canCreatePayments / canEditPayments */
  canMutatePayments: boolean;
  lockReason: SubscriptionBillingLockReason;
  createLockReason: SubscriptionBillingLockReason;
  editLockReason: SubscriptionBillingLockReason;
};

export function getSubscriptionBillingGate(
  input: SubscriptionBillingGateInput
): SubscriptionBillingGate {
  const totalPaid = roundCurrency(Number(input.totalPaid ?? 0));
  const specialOwed =
    input.activeSpecialCaseTotalAmount === null ||
    input.activeSpecialCaseTotalAmount === undefined
      ? null
      : roundCurrency(Number(input.activeSpecialCaseTotalAmount));
  const owedAmount =
    specialOwed !== null
      ? specialOwed
      : roundCurrency(Number(input.subscriptionAmount ?? 0));
  const remainingDue = Math.max(roundCurrency(owedAmount - totalPaid), 0);
  const isPending = input.status === SUBSCRIBED_SEMESTER_STATUSES.PENDING;
  const isPaid = input.status === SUBSCRIBED_SEMESTER_STATUSES.PAID;
  const isFullyPaid = totalPaid >= owedAmount;
  const canEditOrDelete = isPending || isPaid;
  const canCreatePayments = isPending && remainingDue > 0;
  const canMutateSchedules = isPending && !isFullyPaid;

  let createLockReason: SubscriptionBillingLockReason = null;
  if (!isPending) {
    createLockReason = isPaid && isFullyPaid ? "fully_paid" : "not_pending";
  } else if (isFullyPaid || remainingDue <= 0) {
    createLockReason = "fully_paid";
  }

  const editLockReason: SubscriptionBillingLockReason = canEditOrDelete
    ? null
    : "status_locked";

  return {
    owedAmount,
    totalPaid,
    remainingDue,
    isPending,
    isPaid,
    isFullyPaid,
    canCreatePayments,
    canEditPayments: canEditOrDelete,
    canDeletePayments: canEditOrDelete,
    canMutateSchedules,
    canMutatePayments: canCreatePayments,
    lockReason: createLockReason,
    createLockReason,
    editLockReason,
  };
}

export function getBillingMutationLockMessage(
  lockReason: SubscriptionBillingLockReason,
  kind:
    | "payments"
    | "schedules"
    | "create_payment"
    | "edit_payment"
    | "delete_payment" = "payments"
): string {
  if (lockReason === "status_locked") {
    return kind === "delete_payment"
      ? "Payments can only be deleted when the subscription is pending or paid."
      : "Payments can only be edited when the subscription is pending or paid.";
  }

  if (lockReason === "not_pending") {
    if (kind === "schedules") {
      return "Schedules are locked unless the subscription is pending.";
    }
    return "Payments are locked unless the subscription is pending.";
  }

  if (lockReason === "fully_paid") {
    if (kind === "schedules") {
      return "This semester is fully paid. Payments and schedules cannot be changed.";
    }
    if (kind === "create_payment" || kind === "payments") {
      return "This semester is fully paid. New payments cannot be added.";
    }
    return "This semester is fully paid. Payments and schedules cannot be changed.";
  }

  return "Unable to modify billing for this subscription.";
}

export function resolveActiveSpecialCaseOwedAmount(specialCase: {
  status: string;
  total_amount: number;
} | null | undefined): number | null {
  if (!specialCase) {
    return null;
  }

  if (specialCase.status !== ACCOUNT_SPECIAL_CASE_STATUSES.ACTIVE) {
    return null;
  }

  return roundCurrency(Number(specialCase.total_amount ?? 0));
}
