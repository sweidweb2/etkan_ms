import type { StudentStatusValue } from "@/lib/constants/manager-student-status";
import type { RoleValue } from "@/lib/constants/roles";
import type { FieldErrors } from "@/types/auth";

export interface ManagerUserRow {
  id: string;
  full_name: string;
  role: RoleValue;
  is_instructor: boolean;
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

export type ManagerUsersListQuery = {
  page?: number;
  pageSize?: number;
  /** When set, only this staff role. Students are always excluded. */
  role?: RoleValue | null;
  search?: string;
};

export type ManagerUsersListStats = {
  total: number;
  teachers: number;
  staff: number;
};

export type ManagerUsersListData = {
  users: ManagerUserRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  /** Global staff counts (not filtered by the current query). */
  stats: ManagerUsersListStats;
};

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
  warning?: string;
  fieldErrors?: FieldErrors;
  user?: ManagerUserRow;
};
