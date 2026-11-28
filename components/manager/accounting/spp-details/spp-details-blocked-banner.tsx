import { STUDENT_PAYMENT_PHASE_STATUSES } from "@/lib/manager/accounting/constants";
import type { ManagerSppDetail } from "@/types/manager-student-payment";

type SppDetailsBlockedBannerProps = {
  spp: ManagerSppDetail;
};

export function SppDetailsBlockedBanner({
  spp,
}: SppDetailsBlockedBannerProps) {
  if (!spp.drop_completed && !spp.payments_blocked) {
    return null;
  }

  return (
    <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
      {spp.drop_completed
        ? "Payments, schedules, and adjustments are locked because this student completed a semester drop."
        : spp.status === STUDENT_PAYMENT_PHASE_STATUSES.PAID
          ? "Payments are locked because this student assignment is already paid."
          : "Payments and adjustments are blocked because this phase or student assignment is cancelled."}
    </p>
  );
}
