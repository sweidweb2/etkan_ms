import { UNASSIGNED_TEAM_ID } from "@/lib/constants/semester-team";
import type { ManagerSemesterTeamRow } from "@/types/manager-semester-team";
import type { ManagerSemesterRow } from "@/types/manager-phase";

export type SemesterBoardColumns = Record<string, string[]>;

export type SemesterBoardDropTarget = {
  group: string;
  index: number;
};

/** Resolve drop column/index from a drag target without relying on OptimisticSortingPlugin. */
export function resolveSemesterBoardDropTarget(
  columns: SemesterBoardColumns,
  input: {
    sourceId: string;
    targetId: string | null;
    sourceGroup?: string | number | null;
    sourceIndex?: number;
  }
): SemesterBoardDropTarget | null {
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

    // Dropped on another semester card — insert at that card's index.
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

export function buildSemesterBoardColumns(
  semesters: readonly ManagerSemesterRow[],
  teams: readonly ManagerSemesterTeamRow[]
): SemesterBoardColumns {
  const columns: SemesterBoardColumns = {
    [UNASSIGNED_TEAM_ID]: [],
  };

  for (const team of teams) {
    columns[team.id] = [];
  }

  const sorted = [...semesters].sort((left, right) => {
    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order;
    }
    return left.name.localeCompare(right.name);
  });

  for (const semester of sorted) {
    const key = semester.team_id ?? UNASSIGNED_TEAM_ID;
    if (!columns[key]) {
      columns[UNASSIGNED_TEAM_ID].push(semester.id);
      continue;
    }
    columns[key].push(semester.id);
  }

  return columns;
}

export function applySemesterBoardColumns(
  semesters: readonly ManagerSemesterRow[],
  columns: SemesterBoardColumns
): ManagerSemesterRow[] {
  const byId = new Map(semesters.map((semester) => [semester.id, semester]));
  const next: ManagerSemesterRow[] = [];
  const seen = new Set<string>();

  for (const [columnId, semesterIds] of Object.entries(columns)) {
    const teamId =
      columnId === UNASSIGNED_TEAM_ID ? null : columnId;

    semesterIds.forEach((semesterId, index) => {
      const semester = byId.get(semesterId);
      if (!semester) {
        return;
      }
      seen.add(semesterId);
      next.push({
        ...semester,
        team_id: teamId,
        sort_order: index,
      });
    });
  }

  for (const semester of semesters) {
    if (!seen.has(semester.id)) {
      next.push(semester);
    }
  }

  return next;
}

export function applyTeamOrder(
  teams: readonly ManagerSemesterTeamRow[],
  orderedIds: readonly string[]
): ManagerSemesterTeamRow[] {
  const byId = new Map(teams.map((team) => [team.id, team]));
  const next: ManagerSemesterTeamRow[] = [];
  const seen = new Set<string>();

  orderedIds.forEach((id, index) => {
    const team = byId.get(id);
    if (!team) {
      return;
    }
    seen.add(id);
    next.push({ ...team, sort_order: index });
  });

  for (const team of teams) {
    if (!seen.has(team.id)) {
      next.push({ ...team, sort_order: next.length });
    }
  }

  return next;
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
export function commitSemesterCardMove(
  columns: SemesterBoardColumns,
  input: {
    sourceColumnId: string;
    sourceIndex: number;
    targetColumnId: string;
    insertIndex: number;
  }
): SemesterBoardColumns | null {
  const { sourceColumnId, sourceIndex, targetColumnId, insertIndex } = input;

  // Same column: inserting at sourceIndex in the post-removal list puts the
  // card back where it was.
  if (sourceColumnId === targetColumnId && sourceIndex === insertIndex) {
    return null;
  }

  const next = moveSemesterBoardItem(columns, {
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
