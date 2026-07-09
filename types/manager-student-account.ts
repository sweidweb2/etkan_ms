import type { SubscribedSemesterStatusValue } from "@/lib/constants/manager-subscribed-semester-status";

export interface ManagerStudentAccountOverview {
  account_id: string;
  student_profile_id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  opened_at: string;
  total_subscribed: number;
  total_paid: number;
  balance_due: number;
  active_subscriptions: number;
}

export interface ManagerSubscribedSemesterRow {
  id: string;
  account_id: string;
  semester_id: string;
  semester_name: string;
  amount: number;
  status: SubscribedSemesterStatusValue;
  created_at: string;
  paid_amount: number;
}

export interface ManagerStudentPaymentRow {
  id: string;
  subscribed_semester_id: string;
  semester_name: string;
  amount: number;
  currency: string;
  method: string | null;
  paid_at: string;
}

export interface ManagerStudentAccountDetails {
  overview: ManagerStudentAccountOverview;
  subscriptions: ManagerSubscribedSemesterRow[];
  payments: ManagerStudentPaymentRow[];
}
