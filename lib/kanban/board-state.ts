export type BoardColumns = Record<string, string[]>;

export type BoardDropTarget = {
  group: string;
  index: number;
};

type BoardItemBase = {
  id: string;
  name: string;
  sort_order: number;
};

type BoardColumnBase = {
  id: string;
  sort_order: number;
};

/** Resolve drop column/index from a drag target without relying on OptimisticSortingPlugin. */
export function resolveBoardDropTarget(
  columns: BoardColumns,
  input: {
    sourceId: string;
    targetId: string | null;
    sourceGroup?: string | number | null;
    sourceIndex?: number;
  }
): BoardDropTarget | null {
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

    // Dropped on another card — insert at that card's index.
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

export function buildBoardColumns<TItem extends BoardItemBase>(
  items: readonly TItem[],
  columns: readonly BoardColumnBase[],
  options: {
    unassignedId: string;
    getColumnId: (item: TItem) => string | null;
  }
): BoardColumns {
  const next: BoardColumns = {
    [options.unassignedId]: [],
  };

  for (const column of columns) {
    next[column.id] = [];
  }

  const sorted = [...items].sort((left, right) => {
    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order;
    }
    return left.name.localeCompare(right.name);
  });

  for (const item of sorted) {
    const key = options.getColumnId(item) ?? options.unassignedId;
    if (!next[key]) {
      next[options.unassignedId].push(item.id);
      continue;
    }
    next[key].push(item.id);
  }

  return next;
}

export function applyBoardColumns<TItem extends BoardItemBase>(
  items: readonly TItem[],
  columns: BoardColumns,
  options: {
    unassignedId: string;
    assignColumn: (
      item: TItem,
      columnId: string | null,
      sortOrder: number
    ) => TItem;
  }
): TItem[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const next: TItem[] = [];
  const seen = new Set<string>();

  for (const [columnId, itemIds] of Object.entries(columns)) {
    const assignedColumnId =
      columnId === options.unassignedId ? null : columnId;

    itemIds.forEach((itemId, index) => {
      const item = byId.get(itemId);
      if (!item) {
        return;
      }
      seen.add(itemId);
      next.push(options.assignColumn(item, assignedColumnId, index));
    });
  }

  for (const item of items) {
    if (!seen.has(item.id)) {
      next.push(item);
    }
  }

  return next;
}

export function applyColumnOrder<TColumn extends BoardColumnBase>(
  columns: readonly TColumn[],
  orderedIds: readonly string[]
): TColumn[] {
  const byId = new Map(columns.map((column) => [column.id, column]));
  const next: TColumn[] = [];
  const seen = new Set<string>();

  orderedIds.forEach((id, index) => {
    const column = byId.get(id);
    if (!column) {
      return;
    }
    seen.add(id);
    next.push({ ...column, sort_order: index });
  });

  for (const column of columns) {
    if (!seen.has(column.id)) {
      next.push({ ...column, sort_order: next.length });
    }
  }

  return next;
}

/** Move a card across / within board columns. */
export function moveBoardItem(
  columns: BoardColumns,
  input: {
    initialGroup: string | number | undefined | null;
    group: string | number | undefined | null;
    initialIndex: number;
    index: number;
  }
): BoardColumns {
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
export function commitCardMove(
  columns: BoardColumns,
  input: {
    sourceColumnId: string;
    sourceIndex: number;
    targetColumnId: string;
    insertIndex: number;
  }
): BoardColumns | null {
  const { sourceColumnId, sourceIndex, targetColumnId, insertIndex } = input;

  // Same column: inserting at sourceIndex in the post-removal list puts the
  // card back where it was.
  if (sourceColumnId === targetColumnId && sourceIndex === insertIndex) {
    return null;
  }

  const next = moveBoardItem(columns, {
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
 * Commit a column reorder. `insertIndex` is measured against columns
 * excluding the dragged one (post-removal coordinates).
 * Returns null when the position is unchanged.
 */
export function commitColumnMove(
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
