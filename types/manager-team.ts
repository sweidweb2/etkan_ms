import type { TeamStatus } from "@/lib/constants/team";
import type { FieldErrors } from "@/types/auth";
import type { ManagerGuestRow } from "@/types/manager-guest";

export interface ManagerTeamRow {
  id: string;
  name: string;
  expected_start_date: string | null;
  status: TeamStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  guests: ManagerGuestRow[];
}

export type CreateTeamActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  team?: ManagerTeamRow;
};

export type UpdateTeamActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  team?: ManagerTeamRow;
};

export type DeleteTeamActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  teamId?: string;
};

/** Returned by assign/unassign so the client can reconcile its optimistic move. */
export type AssignGuestToTeamActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  guestId?: string;
  /** Null means the guest was moved back to the unassigned guests table. */
  teamId?: string | null;
};
