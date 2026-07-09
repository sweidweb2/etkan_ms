import type { ScheduledPaymentStatusValue } from "@/lib/constants/manager-scheduled-payment-status";
import type { Database } from "@/types/supabase";

type ScheduledPaymentRow =
  Database["public"]["Tables"]["scheduled_payments"]["Row"];

export interface ManagerScheduledPaymentRow
  extends Pick<
    ScheduledPaymentRow,
    | "id"
    | "subscribed_semester_id"
    | "payment_date"
    | "amount"
    | "note"
    | "created_at"
    | "updated_at"
  > {
  status: ScheduledPaymentStatusValue;
}
