import type { ClassStatusValue } from "@/lib/constants/manager-class-status";

/** classes row preview with semester linkage for manager semester detail. */
export interface ManagerSemesterClassRow {
  id: string;
  subject_id: string;
  subject_name: string;
  /** From subjects.nb_sessions for this class subject. */
  subject_nb_sessions: number;
  /** Sessions delivered for this class so far (preview aggregate). */
  completed_sessions: number;
  name: string;
  status: ClassStatusValue;
  semester_id: string | null;
  image_url: string | null;
  enrollment_count: number;
  created_at: string;
}
