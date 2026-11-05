import type { ClassTaskGradeSummary } from "@/lib/manager/class-task-grade-summary";
import type { ClassWeekSkipState } from "@/lib/manager/class-week-skips";
import type { ClassStatusValue } from "@/lib/constants/manager-class-status";
import type { ClassStudentRow } from "@/types/class-student";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";
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

/**
 * Slim class header for the teacher detail page (no teacher_count /
 * subject_nb_sessions / unused manager list fields).
 */
export type TeacherClassDetailRow = {
  id: string;
  name: string;
  subject_name: string;
  /** True when the class is linked to a subject (enables import-subject-tasks). */
  has_subject: boolean;
  status: ClassStatusValue;
  semester_name: string | null;
  enrollment_count: number;
  image_url: string | null;
  card_gradient: string;
};

/** Single parallel load for the teacher class detail page (no grade summary). */
export type TeachingClassPageBundle = {
  classRow: TeacherClassDetailRow;
  sessions: ManagerClassSessionRow[];
  weekSkipState: ClassWeekSkipState;
  tasks: ManagerClassTaskRow[];
  students: ClassStudentRow[];
  assignedAt: string | null;
  hasComputedGrades: boolean;
  lockedUserIds: string[];
};

/** @deprecated Grade summary is loaded via deferred Suspense child. */
export type TeachingClassPageBundleWithSummary = TeachingClassPageBundle & {
  taskGradeSummary: ClassTaskGradeSummary | null;
};

/** Single parallel load for the teacher class task detail page. */
export type TeachingClassTaskPageBundle = {
  task: ManagerClassTaskRow;
  classRow: { id: string; name: string };
  studentTasks: ManagerStudentTaskRow[];
  uploads: ManagerStudentTaskUploadRow[];
  hasComputedGrades: boolean;
  lockedUserIds: string[];
};

/**
 * Inline session detail under the teacher class Sessions tab.
 * Grade locks come from the page bundle — not re-fetched per session open.
 */
export type TeachingClassSessionInlineDetail = {
  session: ManagerClassSessionRow;
  attendees: ManagerSessionAttendeeRow[];
};
