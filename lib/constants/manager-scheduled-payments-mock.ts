import { SCHEDULED_PAYMENT_STATUSES } from "@/lib/constants/manager-scheduled-payment-status";
import type { ManagerScheduledPaymentRow } from "@/types/manager-scheduled-payment";
import type { ManagerSubscribedSemesterRow } from "@/types/manager-student-account";

function hashString(value: string) {
  let hash = 0;

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) % 10_000;
  }

  return hash;
}

export function buildScheduledPaymentsForSubscriptions(
  subscriptions: ManagerSubscribedSemesterRow[]
) {
  const rows: ManagerScheduledPaymentRow[] = [];

  subscriptions.forEach((subscription, index) => {
    const balanceDue = Math.max(subscription.amount - subscription.paid_amount, 0);
    if (balanceDue <= 0) {
      return;
    }

    const seed = hashString(subscription.id);
    const checkpointCount = seed % 3 === 0 ? 2 : 1;

    for (let offset = 0; offset < checkpointCount; offset += 1) {
      const paymentDate = new Date(subscription.created_at);
      paymentDate.setDate(paymentDate.getDate() + 14 + offset * 21);

      const statusCycle = [
        SCHEDULED_PAYMENT_STATUSES.SCHEDULED,
        SCHEDULED_PAYMENT_STATUSES.REMINDED,
        SCHEDULED_PAYMENT_STATUSES.MISSED,
      ] as const;

      rows.push({
        id: `sched-${subscription.id}-${offset}`,
        subscribed_semester_id: subscription.id,
        payment_date: paymentDate.toISOString(),
        amount:
          offset === checkpointCount - 1
            ? Math.round(balanceDue * 100) / 100
            : Math.round((balanceDue / checkpointCount) * 100) / 100,
        status: statusCycle[(index + offset) % statusCycle.length]!,
        note:
          offset === 0
            ? "Follow up with student about remaining semester balance."
            : "Second reminder checkpoint for outstanding balance.",
        created_at: subscription.created_at,
        updated_at: subscription.created_at,
      });
    }
  });

  return rows.sort(
    (left, right) =>
      new Date(left.payment_date).getTime() - new Date(right.payment_date).getTime()
  );
}
