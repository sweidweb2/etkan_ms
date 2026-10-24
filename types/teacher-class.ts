import type { ClassTaskGradeSummary } from "@/lib/manager/class-task-grade-summary";
import type { ClassStatusValue } from "@/lib/constants/manager-class-status";
import type { ManagerClassRow } from "@/types/manager-class-list";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";
import type {
  ManagerClassTaskRow,
  ManagerSessionAttendeeRow,
  ManagerStudentTaskRow,
  ManagerStudentTaskUploadRow,
} from "@/types/manager-class-session-detail";

/** Class the signed-in teacher is assigned to teach. */
export type TeacherClassRow = {
  id: string;
  name: string;
  subject_name: string;
  class_status: ClassStatusValue;
  image_url: string | null;
  /** Key into `CLASS_CARD_GRADIENTS` directory. */
  card_gradient: string;
  assigned_at: string | null;
};

/** Teaching-class detail for the teacher panel. */
export type TeacherClassDetail = {
  classRow: TeacherClassRow;
  sessions: ManagerClassSessionRow[];
  tasks: ManagerClassTaskRow[];
};

/** Single parallel load for the teacher class detail page. */
export type TeachingClassPageBundle = {
  classRow: ManagerClassRow;
  sessions: ManagerClassSessionRow[];
  tasks: ManagerClassTaskRow[];
  students: ManagerClassStudentRow[];
  assignedAt: string | null;
  hasComputedGrades: boolean;
  lockedUserIds: string[];
  taskGradeSummary: ClassTaskGradeSummary | null;
};

/** Single parallel load for the teacher class task detail page. */
export type TeachingClassTaskPageBundle = {
  task: ManagerClassTaskRow;
  classRow: Pick<ManagerClassRow, "id" | "name">;
  studentTasks: ManagerStudentTaskRow[];
  uploads: ManagerStudentTaskUploadRow[];
  hasComputedGrades: boolean;
  lockedUserIds: string[];
};

/** Inline session detail under the teacher class Sessions tab. */
export type TeachingClassSessionInlineDetail = {
  session: ManagerClassSessionRow;
  attendees: ManagerSessionAttendeeRow[];
  lockedUserIds: string[];
  hasComputedGrades: boolean;
};
