import { SCHEDULED_PAYMENT_STATUSES } from "@/lib/constants/manager-scheduled-payment-status";
import { getSubscriptionBillingGate } from "@/lib/manager/subscribed-semester-billing";
import type { ManagerScheduledPaymentRow } from "@/types/manager-scheduled-payment";
import type {
  ManagerStudentPaymentRow,
  ManagerSubscribedSemesterRow,
} from "@/types/manager-student-account";

export type SubscribedSemesterFinancialStats = {
  totalSubscribed: number;
  totalPaid: number;
  totalDue: number;
  paidProgressPercent: number;
  paymentCount: number;
  scheduledReminderCount: number;
  upcomingReminderCount: number;
  upcomingScheduledAmount: number;
  lastPaymentAt: string | null;
  averagePaymentAmount: number | null;
};

export function getSubscribedSemesterFinancialStats(
  subscription: ManagerSubscribedSemesterRow,
  payments: ManagerStudentPaymentRow[],
  scheduledPayments: ManagerScheduledPaymentRow[],
  activeSpecialCaseTotalAmount?: number | null
): SubscribedSemesterFinancialStats {
  const gate = getSubscriptionBillingGate({
    status: subscription.status,
    subscriptionAmount: subscription.amount,
    totalPaid: subscription.paid_amount,
    activeSpecialCaseTotalAmount,
  });
  const totalSubscribed = gate.owedAmount;
  const totalPaid = gate.totalPaid;
  const totalDue = gate.remainingDue;
  const paidProgressPercent =
    totalSubscribed > 0
      ? Math.min(100, Math.round((totalPaid / totalSubscribed) * 100))
      : totalPaid >= 0
        ? 100
        : 0;

  const upcomingReminders = scheduledPayments.filter(
    (row) =>
      row.status === SCHEDULED_PAYMENT_STATUSES.SCHEDULED ||
      row.status === SCHEDULED_PAYMENT_STATUSES.REMINDED
  );

  const lastPayment = [...payments].sort(
    (left, right) =>
      new Date(right.paid_at).getTime() - new Date(left.paid_at).getTime()
  )[0];

  const averagePaymentAmount =
    payments.length > 0
      ? Math.round((totalPaid / payments.length) * 100) / 100
      : null;

  return {
    totalSubscribed,
    totalPaid,
    totalDue,
    paidProgressPercent,
    paymentCount: payments.length,
    scheduledReminderCount: scheduledPayments.length,
    upcomingReminderCount: upcomingReminders.length,
    upcomingScheduledAmount: upcomingReminders.reduce(
      (sum, row) => sum + (row.amount ?? 0),
      0
    ),
    lastPaymentAt: lastPayment?.paid_at ?? null,
    averagePaymentAmount,
  };
}
