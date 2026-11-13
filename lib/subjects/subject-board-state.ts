import { UNASSIGNED_STAGE_ID } from "@/lib/constants/subject-stage";
import type { ManagerStageRow } from "@/types/manager-stage";
import type { ManagerSubjectRow } from "@/types/manager-subject";

export type SubjectBoardColumns = Record<string, string[]>;

export type SubjectBoardDropTarget = {
  group: string;
  index: number;
};

/** Resolve drop column/index from a drag target without relying on OptimisticSortingPlugin. */
export function resolveSubjectBoardDropTarget(
  columns: SubjectBoardColumns,
  input: {
    sourceId: string;
    targetId: string | null;
    sourceGroup?: string | number | null;
    sourceIndex?: number;
  }
): SubjectBoardDropTarget | null {
  const { sourceId, targetId } = input;

  if (targetId) {
    const columnFromDropId = targetId.startsWith("drop-")
      ? targetId.slice("drop-".length)
      : null;
    const columnId =
      columnFromDropId && columnFromDropId in columns
        ? columnFromDropId
        : targetId in columns
          ? targetId
          : null;

    // Dropped on a column shell (empty area / column droppable / column sortable).
    if (columnId) {
      return {
        group: columnId,
        index: columns[columnId].length,
      };
    }

    // Dropped on another subject card — insert at that card's index.
    for (const [groupId, ids] of Object.entries(columns)) {
      const index = ids.indexOf(targetId);
      if (index === -1 || targetId === sourceId) {
        continue;
      }
      return { group: groupId, index };
    }
  }

  if (input.sourceGroup == null) {
    return null;
  }

  return {
    group: String(input.sourceGroup),
    index: input.sourceIndex ?? 0,
  };
}

export function buildSubjectBoardColumns(
  subjects: readonly ManagerSubjectRow[],
  stages: readonly ManagerStageRow[]
): SubjectBoardColumns {
  const columns: SubjectBoardColumns = {
    [UNASSIGNED_STAGE_ID]: [],
  };

  for (const stage of stages) {
    columns[stage.id] = [];
  }

  const sorted = [...subjects].sort((left, right) => {
    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order;
    }
    return left.name.localeCompare(right.name);
  });

  for (const subject of sorted) {
    const key = subject.stage_id ?? UNASSIGNED_STAGE_ID;
    if (!columns[key]) {
      columns[UNASSIGNED_STAGE_ID].push(subject.id);
      continue;
    }
    columns[key].push(subject.id);
  }

  return columns;
}

export function applySubjectBoardColumns(
  subjects: readonly ManagerSubjectRow[],
  columns: SubjectBoardColumns
): ManagerSubjectRow[] {
  const byId = new Map(subjects.map((subject) => [subject.id, subject]));
  const next: ManagerSubjectRow[] = [];
  const seen = new Set<string>();

  for (const [columnId, subjectIds] of Object.entries(columns)) {
    const stageId =
      columnId === UNASSIGNED_STAGE_ID ? null : columnId;

    subjectIds.forEach((subjectId, index) => {
      const subject = byId.get(subjectId);
      if (!subject) {
        return;
      }
      seen.add(subjectId);
      next.push({
        ...subject,
        stage_id: stageId,
        sort_order: index,
      });
    });
  }

  for (const subject of subjects) {
    if (!seen.has(subject.id)) {
      next.push(subject);
    }
  }

  return next;
}

export function applyStageOrder(
  stages: readonly ManagerStageRow[],
  orderedIds: readonly string[]
): ManagerStageRow[] {
  const byId = new Map(stages.map((stage) => [stage.id, stage]));
  const next: ManagerStageRow[] = [];
  const seen = new Set<string>();

  orderedIds.forEach((id, index) => {
    const stage = byId.get(id);
    if (!stage) {
      return;
    }
    seen.add(id);
    next.push({ ...stage, sort_order: index });
  });

  for (const stage of stages) {
    if (!seen.has(stage.id)) {
      next.push({ ...stage, sort_order: next.length });
    }
  }

  return next;
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
  const initialGroup = input.initialGroup == null ? null : String(input.initialGroup);
  const group = input.group == null ? null : String(input.group);

  if (!initialGroup || !group) {
    return columns;
  }

  if (!(initialGroup in columns) || !(group in columns)) {
    return columns;
  }

  if (initialGroup === group) {
    if (input.initialIndex === input.index) {
      return columns;
    }
    const list = [...columns[initialGroup]];
    const [removed] = list.splice(input.initialIndex, 1);
    if (!removed) {
      return columns;
    }
    list.splice(input.index, 0, removed);
    return { ...columns, [initialGroup]: list };
  }

  const from = [...columns[initialGroup]];
  const [removed] = from.splice(input.initialIndex, 1);
  if (!removed) {
    return columns;
  }
  const to = [...columns[group]];
  const insertAt = Math.max(0, Math.min(input.index, to.length));
  to.splice(insertAt, 0, removed);

  return {
    ...columns,
    [initialGroup]: from,
    [group]: to,
  };
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
  const { sourceColumnId, sourceIndex, targetColumnId, insertIndex } = input;

  // Same column: inserting at sourceIndex in the post-removal list puts the
  // card back where it was.
  if (sourceColumnId === targetColumnId && sourceIndex === insertIndex) {
    return null;
  }

  const next = moveSubjectBoardItem(columns, {
    initialGroup: sourceColumnId,
    group: targetColumnId,
    initialIndex: sourceIndex,
    index: insertIndex,
  });

  if (JSON.stringify(next) === JSON.stringify(columns)) {
    return null;
  }

  return next;
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
  const { sourceIndex, insertIndex } = input;

  if (sourceIndex < 0 || sourceIndex >= orderedIds.length) {
    return null;
  }

  // Inserting at sourceIndex in the post-removal list restores the original order.
  if (sourceIndex === insertIndex) {
    return null;
  }

  const next = [...orderedIds];
  const [removed] = next.splice(sourceIndex, 1);
  if (!removed) {
    return null;
  }
  const clamped = Math.max(0, Math.min(insertIndex, next.length));
  next.splice(clamped, 0, removed);

  if (next.every((id, index) => id === orderedIds[index])) {
    return null;
  }

  return next;
}
