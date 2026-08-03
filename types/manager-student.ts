import type { StudentStatusValue } from "@/lib/constants/manager-student-status";
import type { FieldErrors } from "@/types/auth";

/** Combined profiles + student_profiles row for manager student list UI. */
export interface ManagerStudentRow {
  user_id: string;
  student_profile_id: string;
  username: string | null;
  email: string;
  full_name: string;
  birth_date: string | null;
  phone: string | null;
  status: StudentStatusValue;
  created_at: string;
}

/** Student with no enrolled membership on any in_progress class. */
export interface ManagerStudentWithoutActiveClassRow {
  user_id: string;
  student_profile_id: string;
  full_name: string;
  phone: string | null;
  status: StudentStatusValue;
}

/** Academic progress stats for manager student detail view. */
export interface ManagerStudentDetailStats {
  classesRegistered: number;
  classesDone: number;
  classesPending: number;
  tasksDone: number;
  tasksTotal: number;
}

export type CreateStudentActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  student?: ManagerStudentRow;
};

export type UpdateStudentActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  student?: ManagerStudentRow;
};

export type ChangeStudentStatusActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  warning?: string;
  fieldErrors?: FieldErrors;
  status?: StudentStatusValue;
};

export type StudentStatusEligibleClass = {
  student_class_id: string;
  class_id: string;
  class_name: string;
  class_status: string;
};

export type StudentStatusOpenSpp = {
  spp_id: string;
  payment_phase_id: string;
  payment_phase_name: string;
  spp_status: string;
  payment_count: number;
};

export type StudentStatusSideEffectsPreview = {
  user_id: string;
  student_profile_id: string;
  full_name: string;
  status: StudentStatusValue;
  eligible_classes: StudentStatusEligibleClass[];
  open_spps: StudentStatusOpenSpp[];
  can_remove_open_spps: boolean;
  open_spps_blocked_reason: string | null;
};
