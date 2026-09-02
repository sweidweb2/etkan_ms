import type { FieldErrors } from "@/types/auth";
import type {
  FinancialAdjustmentType,
  FinancialAdjustmentValueType,
} from "@/lib/manager/accounting/constants";

export type ManagerFinancialFormRow = {
  id: string;
  student_payment_phase_id: string;
  invite_id: string | null;
  full_name: string;
  school_or_university: string | null;
  date_of_birth: string | null;
  phone: string | null;
  parent_phone: string | null;
  current_gpa: string | null;
  received_financial_aid_before: boolean;
  certificates: string | null;
  family_members: number | null;
  working_family_members: number | null;
  total_family_income: number | null;
  children_currently_learning: number | null;
  has_deceased_parent: boolean;
  both_parents_work: boolean;
  family_hardship: boolean;
  family_chronic_disease: boolean;
  affordable_monthly_payment: number | null;
  student_works: boolean;
  student_monthly_income: number | null;
  agreed_to_rules: boolean;
  created_at: string;
};

export type ManagerFinancialFormInviteRow = {
  id: string;
  student_payment_phase_id: string;
  token: string;
  url: string;
  created_by: string | null;
  created_at: string;
  used_at: string | null;
  form_id: string | null;
  is_used: boolean;
};

export type ManagerFinancialAdjustmentRow = {
  id: string;
  student_payment_phase_id: string;
  type: FinancialAdjustmentType;
  value_type: FinancialAdjustmentValueType;
  value: number;
  reason: string | null;
  effective_date: string;
  created_at: string;
};

/** Prior adjustment on another SPP for the same student (import picker). */
export type ManagerImportableAdjustmentRow = {
  id: string;
  type: FinancialAdjustmentType;
  value_type: FinancialAdjustmentValueType;
  value: number;
  reason: string | null;
  effective_date: string;
  created_at: string;
  source_spp_id: string;
  source_spp_status: string;
  payment_phase_id: string;
  payment_phase_name: string;
  payment_phase_status: string;
};

/** Open-phase SPP with no adjustment, but student had one on another SPP. */
export type ManagerMissingPriorAdjustmentRow = {
  spp_id: string;
  student_id: string;
  student_profile_id: string | null;
  student_label: string;
  payment_phase_id: string;
  payment_phase_name: string;
  semester_id: string;
  semester_name: string;
  spp_status: string;
};

export type CreateFinancialAdjustmentActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  adjustment?: ManagerFinancialAdjustmentRow;
};

export type ImportFinancialAdjustmentActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  adjustment?: ManagerFinancialAdjustmentRow;
};

export type UpdateFinancialAdjustmentActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  adjustment?: ManagerFinancialAdjustmentRow;
};

export type DeleteFinancialAdjustmentActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  student_payment_phase_id?: string;
  payment_phase_id?: string;
};

export type UpsertFinancialFormActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  form?: ManagerFinancialFormRow;
  student_payment_phase_id?: string;
  payment_phase_id?: string;
};

export type DeleteFinancialFormActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  student_payment_phase_id?: string;
  payment_phase_id?: string;
};

export type CreateFinancialFormInviteActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  invite?: ManagerFinancialFormInviteRow;
  student_payment_phase_id?: string;
  payment_phase_id?: string;
};

export type DeleteFinancialFormInviteActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  student_payment_phase_id?: string;
  payment_phase_id?: string;
};

export type SubmitPublicFinancialFormActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
};

export type PublicFinancialFormInviteContext = {
  token: string;
  student_label: string;
  payment_phase_name: string;
  is_used: boolean;
};
