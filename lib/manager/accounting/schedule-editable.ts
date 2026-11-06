import { deriveSppLocks } from "@/lib/manager/accounting/semester-drop-status";
import type {
  PaymentPhaseStatus,
  StudentPaymentPhaseStatus,
} from "@/lib/manager/accounting/constants";

export function isPaymentScheduleEditable(input: {
  spp_status: StudentPaymentPhaseStatus;
  payment_phase_status: PaymentPhaseStatus;
  drop_completed?: boolean;
}): boolean {
  return deriveSppLocks({
    phaseStatus: input.payment_phase_status,
    sppStatus: input.spp_status,
    dropCompleted: Boolean(input.drop_completed),
  }).schedule_editable;
}
