import type { RoleValue } from "@/lib/constants/roles";
import type { FieldErrors } from "@/types/auth";

export interface ManagerUserRow {
  id: string;
  username: string | null;
  role: RoleValue;
  created_at: string;
  email: string;
}

export type CreateStaffUserActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  user?: ManagerUserRow;
};
