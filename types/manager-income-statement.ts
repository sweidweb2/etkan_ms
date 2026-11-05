import type {
  FinancialAdjustmentType,
  FinancialAdjustmentValueType,
  PaymentMethod,
  TransactionType,
} from "@/lib/manager/accounting/constants";

export type ManagerIncomeAdjustmentRow = {
  id: string;
  student_id: string;
  student_label: string;
  payment_phase_id: string;
  payment_phase_name: string;
  type: FinancialAdjustmentType;
  type_label: string;
  value_type: FinancialAdjustmentValueType;
  value: number;
  reason: string | null;
  effective_date: string;
};

export type ManagerIncomeTransactionRow = {
  id: string;
  transaction_date: string;
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  payment_method: PaymentMethod | null;
  recorded_by: string;
  notes: string | null;
  /** Set when mirrored from a workshop payment — edit from Workshops only. */
  linked_workshop_payment_id: string | null;
};

export type ManagerIncomeStatementStats = {
  paymentCount: number;
  /** Period SPP credit payments (money in). */
  totalPaymentsAmount: number;
  /** Period SPP debit payments (drop refunds / money out). */
  totalSppDebitsAmount: number;
  /** All-time net of SPP student payments (credits − debits). */
  totalSppPaymentsAmount: number;
  totalScholarshipAmount: number;
  adjustmentPeopleCount: number;
  adjustmentCount: number;
  scholarshipCount: number;
  discountCount: number;
  manualAdjustmentCount: number;
  totalAdjustmentsValue: number;
  transactionCount: number;
  totalCreditsAmount: number;
  totalDebitsAmount: number;
  /** Period SPP net + external credits − external debits. */
  availableMoney: number;
};

export type IncomeStatementPeriod = {
  year: number;
  /** 1–12 */
  month: number;
};

export type IncomeStatementMonthOption = {
  year: number;
  month: number;
  key: string;
  label: string;
};

export type ManagerIncomeStatementData = {
  stats: ManagerIncomeStatementStats;
  adjustments: ManagerIncomeAdjustmentRow[];
  transactions: ManagerIncomeTransactionRow[];
};

export type CreateTransactionActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export type UpdateTransactionActionState = CreateTransactionActionState;

export type DeleteTransactionActionState = CreateTransactionActionState;
