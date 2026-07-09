import type { ClassStatusValue } from "@/lib/constants/manager-class-status";

export interface ManagerSubjectClassRow {
  id: string;
  subject_id: string;
  name: string;
  status: ClassStatusValue;
  created_at: string;
}
