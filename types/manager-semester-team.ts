import type { FieldErrors } from "@/types/auth";
import type { ManagerSemesterRow } from "@/types/manager-semester";

export interface ManagerSemesterTeamRow {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export type CreateSemesterTeamActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  team?: ManagerSemesterTeamRow;
};

export type AssignSemestersToTeamActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  semesters?: ManagerSemesterRow[];
  semesterIds?: string[];
  teamId?: string | null;
};

export type ReorderSemesterTeamsActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  teams?: ManagerSemesterTeamRow[];
};

export type SaveSemesterBoardActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
};
