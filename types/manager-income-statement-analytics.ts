import type {
  FinancialAdjustmentType,
  FinancialAdjustmentValueType,
  PaymentMethod,
  StudentPaymentPhaseStatus,
  TransactionType,
} from "@/lib/manager/accounting/constants";

export type IncomeStatementAnalyticsPeriodPoint = {
  key: string;
  label: string;
  payments: number;
  credits: number;
  debits: number;
  adjustments: number;
};

export type IncomeStatementAnalyticsNamedValue = {
  name: string;
  value: number;
};

export type ManagerIncomeAnalyticsPaymentRow = {
  id: string;
  student_id: string;
  payment_date: string;
  amount: number;
  payment_method: PaymentMethod;
  received_by: string;
  student_label: string;
  payment_phase_name: string;
  notes: string | null;
};

export type ManagerIncomeAnalyticsTransactionRow = {
  id: string;
  transaction_date: string;
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  payment_method: PaymentMethod | null;
  recorded_by: string;
  notes: string | null;
};

export type ManagerIncomeAnalyticsUnpaidStudentRow = {
  spp_id: string;
  student_id: string;
  student_label: string;
  payment_phase_name: string;
  status: StudentPaymentPhaseStatus;
  remaining_amount: number;
  final_amount_due: number;
  total_paid: number;
  /**
   * Approximate amount still expected this month:
   * `final_amount_due / duration_months` (includes adjustments), capped by remaining.
   */
  approx_monthly_remaining: number;
};

export type ManagerIncomeAnalyticsAdjustedStudentRow = {
  adjustment_id: string;
  spp_id: string;
  student_id: string;
  student_label: string;
  payment_phase_name: string;
  type: FinancialAdjustmentType;
  type_label: string;
  value_type: FinancialAdjustmentValueType;
  value: number;
  adjustment_amount: number;
  final_amount_due: number;
  paid_this_period: number;
};

export type ManagerIncomeStatementAnalyticsData = {
  year: number;
  month: number | null;
  availableYears: number[];
  periodSeries: IncomeStatementAnalyticsPeriodPoint[];
  composition: IncomeStatementAnalyticsNamedValue[];
  totals: {
    payments: number;
    credits: number;
    debits: number;
    adjustments: number;
  };
  payments: ManagerIncomeAnalyticsPaymentRow[];
  transactions: ManagerIncomeAnalyticsTransactionRow[];
  unpaidStudents: ManagerIncomeAnalyticsUnpaidStudentRow[];
  adjustedStudents: ManagerIncomeAnalyticsAdjustedStudentRow[];
};

export type ManagerIncomeStatementAnalyticsSummary = Pick<
  ManagerIncomeStatementAnalyticsData,
  | "year"
  | "month"
  | "availableYears"
  | "periodSeries"
  | "composition"
  | "totals"
>;

export type ManagerIncomeStatementAnalyticsTables = Pick<
  ManagerIncomeStatementAnalyticsData,
  "payments" | "transactions" | "unpaidStudents" | "adjustedStudents"
>;
