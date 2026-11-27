export type ColumnHitRange = {
  id: string;
  left: number;
  right: number;
  center: number;
};

/** Target column from pointer X — containing range, else closest horizontal center. */
export function findTargetColumnId(
  pointerX: number,
  columns: readonly ColumnHitRange[]
): string | null {
  if (columns.length === 0) {
    return null;
  }

  const containing = columns.find(
    (column) => pointerX >= column.left && pointerX <= column.right
  );
  if (containing) {
    return containing.id;
  }

  let best = columns[0]!;
  let bestDistance = Math.abs(best.center - pointerX);
  for (let index = 1; index < columns.length; index += 1) {
    const column = columns[index]!;
    const distance = Math.abs(column.center - pointerX);
    if (distance < bestDistance) {
      best = column;
      bestDistance = distance;
    }
  }
  return best.id;
}

/**
 * Insertion index from pointer Y vs card midpoints (excluding the dragged card).
 * Top half of a card → insert before; bottom half → after.
 */
export function findInsertIndex(
  pointerY: number,
  cardRects: readonly { top: number; height: number }[]
): number {
  for (let index = 0; index < cardRects.length; index += 1) {
    const rect = cardRects[index]!;
    const midpoint = rect.top + rect.height / 2;
    if (pointerY < midpoint) {
      return index;
    }
  }
  return cardRects.length;
}

/**
 * Column insertion index from pointer X vs column midpoints
 * (excluding the dragged column — post-removal coordinates).
 * Left half of a column → insert before; right half → after.
 */
export function findColumnInsertIndex(
  pointerX: number,
  columnRects: readonly { left: number; width: number }[]
): number {
  for (let index = 0; index < columnRects.length; index += 1) {
    const rect = columnRects[index]!;
    const midpoint = rect.left + rect.width / 2;
    if (pointerX < midpoint) {
      return index;
    }
  }
  return columnRects.length;
}

export function measureColumnRanges(
  columnElements: ReadonlyMap<string, HTMLElement>
): ColumnHitRange[] {
  const ranges: ColumnHitRange[] = [];
  for (const [id, element] of columnElements) {
    const rect = element.getBoundingClientRect();
    ranges.push({
      id,
      left: rect.left,
      right: rect.right,
      center: (rect.left + rect.right) / 2,
    });
  }
  return ranges;
}
