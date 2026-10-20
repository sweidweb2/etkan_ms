import type { FieldErrors } from "@/types/auth";

/** Active Month paid clearance attached to an SPP payload (null when missing/expired). */
export type ManagerSppClearanceDto = {
  id: string;
  duration_days: number;
  notes: string | null;
  created_at: string;
  expires_at: string;
  is_active: true;
};

export type UpsertSppClearanceActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  clearance?: ManagerSppClearanceDto;
  student_payment_phase_id?: string;
  payment_phase_id?: string;
};

export type DeleteSppClearanceActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  student_payment_phase_id?: string;
  payment_phase_id?: string;
};

export type BulkCreateSppClearancesActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  created_count?: number;
  payment_phase_id?: string;
};

export type BulkDeleteSppClearancesActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  deleted_count?: number;
  payment_phase_id?: string;
};
