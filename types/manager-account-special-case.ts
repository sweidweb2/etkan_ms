import type {
  AccountSpecialCaseStatusValue,
  AccountSpecialCaseTypeValue,
} from "@/lib/constants/manager-account-special-case";

export interface ManagerAccountSpecialCaseRow {
  id: string;
  account_id: string;
  semester_id: string;
  semester_name: string;
  total_amount: number;
  percentage_discount: number;
  explanation: string;
  approved_by: string | null;
  case_type: AccountSpecialCaseTypeValue;
  status: AccountSpecialCaseStatusValue;
  created_at: string;
  updated_at: string;
}
