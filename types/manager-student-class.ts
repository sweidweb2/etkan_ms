import type { ClassStatusValue } from "@/lib/constants/manager-class-status";

/** Joined class row for manager student detail tabs (student_class + class + subject). */
export interface ManagerStudentClassRow {
  id: string;
  class_id: string;
  name: string;
  subject_name: string;
  class_status: ClassStatusValue;
  image_url: string | null;
  /** Key into `CLASS_CARD_GRADIENTS` directory. */
  card_gradient: string;
  joined_at: string;
  /** Set on student self routes only. */
  is_team_leader?: boolean;
}
