import { UNASSIGNED_TEAM_ID } from "@/lib/constants/semester-team";
import {
  applyBoardColumns,
  applyColumnOrder,
  buildBoardColumns,
  commitCardMove,
  commitColumnMove,
  moveBoardItem,
  type BoardColumns,
} from "@/lib/kanban/board-state";
import type { ManagerSemesterTeamRow } from "@/types/manager-semester-team";
import type { ManagerSemesterRow } from "@/types/manager-phase";

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

/** Move a card across / within board columns. */
export function moveSemesterBoardItem(
  columns: SemesterBoardColumns,
  input: {
    initialGroup: string | number | undefined | null;
    group: string | number | undefined | null;
    initialIndex: number;
    index: number;
  }
): SemesterBoardColumns {
  return moveBoardItem(columns, input);
}

/**
 * Commit a drop. `insertIndex` is measured against cards excluding the dragged
 * card (post-removal coordinates), so same-column drops use it directly.
 * Returns null when the position is unchanged.
 */
export function commitSemesterCardMove(
  columns: SemesterBoardColumns,
  input: {
    sourceColumnId: string;
    sourceIndex: number;
    targetColumnId: string;
    insertIndex: number;
  }
): SemesterBoardColumns | null {
  return commitCardMove(columns, input);
}

/**
 * Commit a team-column reorder. `insertIndex` is measured against columns
 * excluding the dragged one (post-removal coordinates).
 * Returns null when the position is unchanged.
 */
export function commitTeamColumnMove(
  orderedIds: readonly string[],
  input: {
    sourceIndex: number;
    insertIndex: number;
  }
): string[] | null {
  return commitColumnMove(orderedIds, input);
}
