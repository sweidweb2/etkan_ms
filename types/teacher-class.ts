import type { ManagerClassRow } from "@/types/manager-class-list";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";

/** Subject the teacher reaches through assigned classes (read for Phase 1). */
export interface TeacherSubjectRow {
  id: string;
  name: string;
  syllabus_link: string | null;
  reference_link: string | null;
  handout_link: string | null;
  nb_sessions: number;
  /** Classes of this subject the teacher is assigned to. */
  taught_class_ids: string[];
  taught_class_count: number;
}

/** Read-only class detail for a teacher assigned via `class_teacher`. */
export interface TeacherClassDetail {
  classRow: ManagerClassRow;
  sessions: ManagerClassSessionRow[];
  students: ManagerClassStudentRow[];
}
