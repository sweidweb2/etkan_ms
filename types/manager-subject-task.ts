import type { FieldErrors } from "@/types/auth";

export type ManagerSubjectTaskRow = {
  id: string;
  subject_id: string;
  title: string;
  description: string | null;
  period: number;
  max_grade: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type CreateSubjectTaskActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  task?: ManagerSubjectTaskRow;
};

export type UpdateSubjectTaskActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  task?: ManagerSubjectTaskRow;
};

export type DeleteSubjectTaskActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  taskId?: string;
};
