import {
  EDGE_SCROLL_MAX_SPEED,
  EDGE_SCROLL_ZONE_PX,
} from "@/lib/kanban/pointer-drag-types";
import {
  findColumnInsertIndex,
  findInsertIndex,
  findTargetColumnId,
  measureColumnRanges,
} from "@/lib/kanban/pointer-hit-test";

export type CardDropTarget = {
  targetColumnId: string;
  insertIndex: number;
};

export type ColumnDropTarget = {
  insertIndex: number;
};

function cardRectsExcluding(
  list: HTMLElement | undefined,
  draggingCardId: string
): { top: number; height: number }[] {
  if (!list) {
    return [];
  }

  return Array.from(
    list.querySelectorAll<HTMLElement>("[data-kanban-card][data-card-id]")
  )
    .filter((node) => node.dataset.cardId !== draggingCardId)
    .map((node) => {
      const rect = node.getBoundingClientRect();
      return { top: rect.top, height: rect.height };
    });
}

/** Resolve card drop column + insert index from pointer position. */
export function measureCardDropTarget(
  pointerX: number,
  pointerY: number,
  columnElements: ReadonlyMap<string, HTMLElement>,
  listElements: ReadonlyMap<string, HTMLElement>,
  draggingCardId: string,
  fallbackColumnId?: string
): CardDropTarget | null {
  const ranges = measureColumnRanges(columnElements);
  const targetColumnId =
    findTargetColumnId(pointerX, ranges) ?? fallbackColumnId ?? null;
  if (!targetColumnId) {
    return null;
  }

  return {
    targetColumnId,
    insertIndex: findInsertIndex(
      pointerY,
      cardRectsExcluding(listElements.get(targetColumnId), draggingCardId)
    ),
  };
}

/** Resolve column insert index from pointer X against non-dragged columns. */
export function measureColumnDropTarget(
  pointerX: number,
  columnOrder: readonly string[],
  columnElements: ReadonlyMap<string, HTMLElement>,
  draggingColumnId: string
): ColumnDropTarget {
  const rects: { left: number; width: number }[] = [];
  for (const id of columnOrder) {
    if (id === draggingColumnId) {
      continue;
    }
    const element = columnElements.get(id);
    if (!element) {
      continue;
    }
    const rect = element.getBoundingClientRect();
    rects.push({ left: rect.left, width: rect.width });
  }

  return { insertIndex: findColumnInsertIndex(pointerX, rects) };
}

function edgeScrollDelta(distanceIntoZone: number): number {
  return EDGE_SCROLL_MAX_SPEED * (1 - distanceIntoZone / EDGE_SCROLL_ZONE_PX);
}

/**
 * Scroll board (and optional card list) when the pointer is in an edge zone.
 * Returns whether any scroll was applied.
 */
export function applyPointerEdgeScroll(options: {
  pointerX: number;
  pointerY: number;
  board: HTMLElement;
  list?: HTMLElement | null;
}): boolean {
  const { pointerX, pointerY, board, list } = options;
  let scrolled = false;

  const boardRect = board.getBoundingClientRect();
  const distLeft = pointerX - boardRect.left;
  const distRight = boardRect.right - pointerX;
  if (distLeft >= 0 && distLeft < EDGE_SCROLL_ZONE_PX) {
    board.scrollLeft -= edgeScrollDelta(distLeft);
    scrolled = true;
  } else if (distRight >= 0 && distRight < EDGE_SCROLL_ZONE_PX) {
    board.scrollLeft += edgeScrollDelta(distRight);
    scrolled = true;
  }

  if (list && list.scrollHeight > list.clientHeight) {
    const listRect = list.getBoundingClientRect();
    const distTop = pointerY - listRect.top;
    const distBottom = listRect.bottom - pointerY;
    if (distTop >= 0 && distTop < EDGE_SCROLL_ZONE_PX) {
      list.scrollTop -= edgeScrollDelta(distTop);
      scrolled = true;
    } else if (distBottom >= 0 && distBottom < EDGE_SCROLL_ZONE_PX) {
      list.scrollTop += edgeScrollDelta(distBottom);
      scrolled = true;
    }
  }

  return scrolled;
}

export function isPointerOutsideElement(
  clientX: number,
  clientY: number,
  element: HTMLElement
): boolean {
  const rect = element.getBoundingClientRect();
  return (
    clientX < rect.left ||
    clientX > rect.right ||
    clientY < rect.top ||
    clientY > rect.bottom
  );
}
