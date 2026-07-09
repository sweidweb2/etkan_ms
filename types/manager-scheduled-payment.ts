import type { ScheduledPaymentStatusValue } from "@/lib/constants/manager-scheduled-payment-status";

export interface ManagerScheduledPaymentRow {
  id: string;
  subscribed_semester_id: string;
  payment_date: string;
  amount: number | null;
  status: ScheduledPaymentStatusValue;
  note: string | null;
  created_at: string;
  updated_at: string;
}
