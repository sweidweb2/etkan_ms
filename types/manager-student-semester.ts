import type { StudentSemesterStatusValue } from "@/lib/constants/manager-student-semester-status";

export interface ManagerStudentSemesterRow {
  id: string;
  student_profile_id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  semester_id: string;
  semester_name: string;
  status: StudentSemesterStatusValue;
  created_at: string;
}

export type ManagerAccountingPaymentMissedMonths = 1 | 2 | 3 | 4 | 5 | 6;

export type ManagerAccountingPaymentAlertReason =
  | "complex"
  | "done"
  | "scheduled"
  | "missed_schedule"
  | "low_payment"
  | "no_payment_1_month"
  | "no_payment_2_months"
  | "no_payment_3_months"
  | "no_payment_4_months"
  | "no_payment_5_months"
  | "no_payment_6_months";

export interface ManagerAccountingStudentRow {
  student_profile_id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  semester_id: string | null;
  semester_name: string | null;
  enrollment_status: StudentSemesterStatusValue | null;
  enrolled_at: string | null;
  total_amount: number | null;
  total_paid: number | null;
  balance_due: number | null;
  /** True when enrolled in a semester and a payment alert applies. */
  payment_alert: boolean;
  /** Paid total for this semester subscription is under $100. */
  low_payment: boolean;
  /** Missed-payment severity (1–6), or null when paid this month. */
  payment_missed_months: ManagerAccountingPaymentMissedMonths | null;
  payment_alert_reasons: ManagerAccountingPaymentAlertReason[];
  /** Special case type for this account+semester, if any. */
  special_case_type: "scholarship" | "done" | null;
  /** Scholarship with zero paid total for this semester. */
  special_case_no_money: boolean;
  /** True when this semester subscription has a scheduled payment with status missed. */
  has_missed_scheduled_payment: boolean;
}
