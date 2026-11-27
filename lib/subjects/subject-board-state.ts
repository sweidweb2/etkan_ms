import { UNASSIGNED_STAGE_ID } from "@/lib/constants/subject-stage";
import {
  applyBoardColumns,
  applyColumnOrder,
  buildBoardColumns,
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
