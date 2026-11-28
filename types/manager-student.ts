import type { StudentStatusValue } from "@/lib/constants/manager-student-status";
import type { RoleValue } from "@/lib/constants/roles";
import type { FieldErrors } from "@/types/auth";

/** Combined profiles + student_profiles row for manager student list UI. */
export interface ManagerStudentRow {
  user_id: string;
  student_profile_id: string;
  email: string;
  full_name: string;
  birth_date: string | null;
  phone: string | null;
  status: StudentStatusValue;
  created_at: string;
  /** Account fields, present when the row is built from a profiles read. */
  role?: RoleValue;
  is_instructor?: boolean;
  /** Public avatar URL; loaded on detail/profile reads only. */
  avatar_url?: string | null;
  /** True when the student has any pending semester drop. */
  has_pending_drop?: boolean;
  /**
   * Class/semester add-student pickers only: withdrawn from this class's semester.
   * Shown in list but not selectable until rejoin is implemented.
   */
  semester_dropped?: boolean;
}

export type ManagerStudentsListQuery = {
  page?: number;
  pageSize?: number;
  status?: StudentStatusValue | null;
  search?: string;
  /** When true, only students with a pending semester drop. */
  pendingDrop?: boolean;
};

export type ManagerStudentsListStats = {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
};

export type ManagerStudentsListData = {
  students: ManagerStudentRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  /** Global counts (not filtered by the current query). */
  stats: ManagerStudentsListStats;
};

/** Paged candidates for class/semester add-student pickers. */
export type ManagerAvailableStudentsQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export type ManagerAvailableStudentsData = {
  students: ManagerStudentRow[];
  totalCount: number;
  page: number;
  pageSize: number;
};

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
  semester_id?: string | null;
};

export type StudentStatusDroppableSemester = {
  semester_id: string;
  payment_phase_name: string;
  spp_id: string;
  payment_count: number;
  origin_class_id: string;
  origin_class_name: string;
  total_paid: number;
  final_amount_due: number;
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
  can_inactivate: boolean;
  inactivate_blocked_reason: string | null;
  has_pending_drop: boolean;
  droppable_semesters: StudentStatusDroppableSemester[];
  needs_immediate_drop: boolean;
};
