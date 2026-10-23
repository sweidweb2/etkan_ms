import type { FieldErrors } from "@/types/auth";
import type { TeacherSubjectRow } from "@/types/teacher-class";

export type UpdateSubjectLinksActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  subject?: TeacherSubjectRow;
};
