import type { StudentStatusValue } from "@/lib/constants/manager-student-status";
import type {
  ManagerDropRefundPaymentRow,
  ManagerNeedRefundRow,
  ManagerSemesterDropRequestRow,
} from "@/types/manager-semester-drop";
import type { ManagerStudentRow } from "@/types/manager-student";

export type DropStudentConsoleClassRow = {
  student_class_id: string;
  class_id: string;
  class_name: string;
  class_status: string;
  semester_id: string | null;
  semester_name: string | null;
  is_team_leader: boolean;
  /** False when pending drop or SPP on that semester has payments. */
  can_remove: boolean;
  remove_blocked_reason: string | null;
};

export type DropStudentConsolePaymentRow = {
  id: string;
  payment_date: string;
  amount: number;
  type: string;
  payment_method: string;
  received_by: string;
  notes: string | null;
  created_at: string;
};

export type DropStudentConsoleSppRow = {
  spp_id: string;
  payment_phase_id: string;
  payment_phase_name: string;
  payment_phase_status: string;
  semester_id: string | null;
  semester_name: string | null;
  spp_status: string;
  total_paid: number;
  final_amount_due: number;
  payment_count: number;
  payments: DropStudentConsolePaymentRow[];
};

export type DropStudentConsoleDropTarget = {
  semester_id: string;
  semester_name: string;
  origin_class_id: string;
  origin_class_name: string;
  origin_membership_id: string;
  payment_phase_name: string | null;
  spp_id: string | null;
  payment_count: number;
  total_paid: number;
  final_amount_due: number;
  has_pending_drop: boolean;
  pending_drop_request_id: string | null;
};

export type DropStudentConsoleHotSignals = {
  has_pending_drop: boolean;
  pending_drop_count: number;
  needs_immediate_drop: boolean;
  droppable_paid_semester_count: number;
  unpaid_open_spp_count: number;
  eligible_class_count: number;
  refund_owed_count: number;
  refund_owed_remaining_total: number;
  can_inactivate: boolean;
  inactivate_blocked_reason: string | null;
};

export type DropStudentConsoleDropRow = ManagerSemesterDropRequestRow & {
  semester_name: string | null;
  phase_name: string | null;
};

export type DropStudentConsoleSnapshot = {
  student: ManagerStudentRow;
  hot: DropStudentConsoleHotSignals;
  classes: DropStudentConsoleClassRow[];
  drop_targets: DropStudentConsoleDropTarget[];
  billing: DropStudentConsoleSppRow[];
  drops: DropStudentConsoleDropRow[];
  need_refund: ManagerNeedRefundRow[];
  processed_refund_payments: ManagerDropRefundPaymentRow[];
  status: StudentStatusValue;
};

export type DropAllSemestersActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  completedCount?: number;
  failedSemesterId?: string | null;
};
