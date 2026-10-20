import type { ClassStatusValue } from "@/lib/constants/manager-class-status";

/** Class the signed-in teacher is assigned to teach. */
export type TeacherClassRow = {
  id: string;
  name: string;
  subject_name: string;
  class_status: ClassStatusValue;
  image_url: string | null;
  assigned_at: string | null;
};
