import type { FieldErrors } from "@/types/auth";

export interface ManagerSemesterRow {
  id: string;
  name: string;
  /** Unique 4-digit public semester code. */
  semester_code: string;
  created_at: string;
  /** Optional organizer team on the manage-semesters board. */
  team_id: string | null;
  /** Order within the team column (or unassigned). */
  sort_order: number;
}

export type CreateSemesterActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  semester?: ManagerSemesterRow;
};

export type UpdateSemesterActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  semester?: ManagerSemesterRow;
};
