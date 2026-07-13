import type { StudentStatusValue } from "@/lib/constants/manager-student-status";
import type { RoleValue } from "@/lib/constants/roles";
import type { FieldErrors } from "@/types/auth";

export interface ManagerUserRow {
  id: string;
  username: string | null;
  role: RoleValue;
  created_at: string;
  email: string;
  /** Present when a student_profiles row exists (kept even if role is no longer student). */
  student_profile_id?: string | null;
  /** Prefill for edit when a student_profiles row exists. */
  student_full_name?: string | null;
  student_birth_date?: string | null;
  student_phone?: string | null;
  student_status?: StudentStatusValue | null;
}

export type CreateStaffUserActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  user?: ManagerUserRow;
};

export type UpdateManagerUserActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  user?: ManagerUserRow;
};
