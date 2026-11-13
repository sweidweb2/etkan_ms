import type { FieldErrors } from "@/types/auth";

export interface ManagerStageRow {
  id: string;
  name: string;
  period: number;
  level: number;
  sort_order: number;
  created_at: string;
}

export type CreateStageActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  stage?: ManagerStageRow;
};

export type AssignSubjectsToStageActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  subjectIds?: string[];
  stageId?: string | null;
};

export type SetSubjectStageActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  subjectId?: string;
  stageId?: string | null;
};

export type ReorderStagesActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  stages?: ManagerStageRow[];
};

export type SaveSubjectBoardActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
};
