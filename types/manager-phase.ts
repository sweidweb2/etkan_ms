import type { FieldErrors } from "@/types/auth";

export interface ManagerSemesterRow {
  id: string;
  name: string;
  /** Unique 4-digit public semester code. */
  semester_code: string;
  created_at: string;
}

export type CreateSemesterActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  semester?: ManagerSemesterRow;
};

export type UpdateSemesterActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  semester?: ManagerSemesterRow;
};
