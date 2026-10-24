import type { ClassStatusValue } from "@/lib/constants/manager-class-status";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";
import type { ManagerClassTaskRow } from "@/types/manager-class-session-detail";

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
