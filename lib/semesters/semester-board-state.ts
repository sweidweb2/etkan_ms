import { UNASSIGNED_TEAM_ID } from "@/lib/constants/semester-team";
import {
  applyBoardColumns,
  applyColumnOrder,
  buildBoardColumns,
  commitCardMove,
  commitColumnMove,
  type BoardColumns,
} from "@/lib/kanban/board-state";
import type { ManagerSemesterTeamRow } from "@/types/manager-semester-team";
import type { ManagerSemesterRow } from "@/types/manager-semester";

export type SemesterBoardColumns = BoardColumns;

export function buildSemesterBoardColumns(
  semesters: readonly ManagerSemesterRow[],
  teams: readonly ManagerSemesterTeamRow[]
): SemesterBoardColumns {
  return buildBoardColumns(semesters, teams, {
    unassignedId: UNASSIGNED_TEAM_ID,
    getColumnId: (semester) => semester.team_id,
  });
}

export function applySemesterBoardColumns(
  semesters: readonly ManagerSemesterRow[],
  columns: SemesterBoardColumns
): ManagerSemesterRow[] {
  return applyBoardColumns(semesters, columns, {
    unassignedId: UNASSIGNED_TEAM_ID,
    assignColumn: (semester, teamId, sortOrder) => ({
      ...semester,
      team_id: teamId,
      sort_order: sortOrder,
    }),
  });
}

export function applyTeamOrder(
  teams: readonly ManagerSemesterTeamRow[],
  orderedIds: readonly string[]
): ManagerSemesterTeamRow[] {
  return applyColumnOrder(teams, orderedIds);
}

/** @deprecated Prefer `commitCardMove` from `@/lib/kanban/board-state`. */
export const commitSemesterCardMove = commitCardMove;

/** @deprecated Prefer `commitColumnMove` from `@/lib/kanban/board-state`. */
export const commitTeamColumnMove = commitColumnMove;
