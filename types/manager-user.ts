import type { RoleValue } from "@/lib/constants/roles";
import type { FieldErrors } from "@/types/auth";

export interface ManagerUserRow {
  id: string;
  username: string | null;
  role: RoleValue;
  created_at: string;
  email: string;
  /** Present when role is student and a student_profiles row exists. */
  student_profile_id?: string | null;
}

export type CreateStaffUserActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  user?: ManagerUserRow;
};
