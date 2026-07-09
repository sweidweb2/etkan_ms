import type { FieldErrors } from "@/types/auth";

export interface ManagerSubjectRow {
  id: string;
  name: string;
  syllabus_link: string | null;
  reference_link: string | null;
  handout_link: string | null;
  created_at: string;
  /** subjects.nb_sessions — planned curriculum session count. */
  nb_sessions: number;
  /** Classes linked to this subject. */
  class_count: number;
}

export type CreateSubjectActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  subject?: ManagerSubjectRow;
};
