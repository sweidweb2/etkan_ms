import type { ClassStatusValue } from "@/lib/constants/manager-class-status";

export interface ManagerSubjectClassRow {
  id: string;
  subject_id: string;
  name: string;
  status: ClassStatusValue;
  image_url: string | null;
  /** From subjects.nb_sessions for this class subject. */
  subject_nb_sessions: number;
  /** Count of session rows created for this class. */
  completed_sessions: number;
  created_at: string;
}
