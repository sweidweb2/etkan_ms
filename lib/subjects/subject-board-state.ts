import { UNASSIGNED_STAGE_ID } from "@/lib/constants/subject-stage";
import {
  applyBoardColumns,
  applyColumnOrder,
  buildBoardColumns,
  commitCardMove,
  commitColumnMove,
  moveBoardItem,
  type BoardColumns,
} from "@/lib/kanban/board-state";
import type { ManagerStageRow } from "@/types/manager-stage";
import type { ManagerSubjectRow } from "@/types/manager-subject";

export type SubjectBoardColumns = BoardColumns;

export function buildSubjectBoardColumns(
  subjects: readonly ManagerSubjectRow[],
  stages: readonly ManagerStageRow[]
): SubjectBoardColumns {
  return buildBoardColumns(subjects, stages, {
    unassignedId: UNASSIGNED_STAGE_ID,
    getColumnId: (subject) => subject.stage_id,
  });
}

export function applySubjectBoardColumns(
  subjects: readonly ManagerSubjectRow[],
  columns: SubjectBoardColumns
): ManagerSubjectRow[] {
  return applyBoardColumns(subjects, columns, {
    unassignedId: UNASSIGNED_STAGE_ID,
    assignColumn: (subject, stageId, sortOrder) => ({
      ...subject,
      stage_id: stageId,
      sort_order: sortOrder,
    }),
  });
}

export function applyStageOrder(
  stages: readonly ManagerStageRow[],
  orderedIds: readonly string[]
): ManagerStageRow[] {
  return applyColumnOrder(stages, orderedIds);
}

/** Move a card across / within board columns. */
export function moveSubjectBoardItem(
  columns: SubjectBoardColumns,
  input: {
    initialGroup: string | number | undefined | null;
    group: string | number | undefined | null;
    initialIndex: number;
    index: number;
  }
): SubjectBoardColumns {
  return moveBoardItem(columns, input);
}

/**
 * Commit a drop. `insertIndex` is measured against cards excluding the dragged
 * card (post-removal coordinates), so same-column drops use it directly.
 * Returns null when the position is unchanged.
 */
export function commitSubjectCardMove(
  columns: SubjectBoardColumns,
  input: {
    sourceColumnId: string;
    sourceIndex: number;
    targetColumnId: string;
    insertIndex: number;
  }
): SubjectBoardColumns | null {
  return commitCardMove(columns, input);
}

/**
 * Commit a stage-column reorder. `insertIndex` is measured against columns
 * excluding the dragged one (post-removal coordinates).
 * Returns null when the position is unchanged.
 */
export function commitStageColumnMove(
  orderedIds: readonly string[],
  input: {
    sourceIndex: number;
    insertIndex: number;
  }
): string[] | null {
  return commitColumnMove(orderedIds, input);
}
