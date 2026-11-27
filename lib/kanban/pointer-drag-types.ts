export const CARD_DRAG_THRESHOLD_PX = 5;
export const EDGE_SCROLL_ZONE_PX = 60;
export const EDGE_SCROLL_MAX_SPEED = 28;
export const COLUMN_OVERLAY_PREVIEW_CARDS = 3;

export type CardDragState = {
  dragType: "card";
  draggingCardId: string;
  sourceColumnId: string;
  sourceIndex: number;
  targetColumnId: string;
  insertIndex: number;
  pointerX: number;
  pointerY: number;
  overlayWidth: number;
  overlayHeight: number;
  grabOffsetX: number;
  grabOffsetY: number;
};

export type ColumnDragState = {
  dragType: "column";
  draggingColumnId: string;
  sourceIndex: number;
  insertIndex: number;
  pointerX: number;
  pointerY: number;
  overlayWidth: number;
  overlayHeight: number;
  grabOffsetX: number;
  grabOffsetY: number;
};

export type BoardDragState = CardDragState | ColumnDragState;

export type PendingCardPointer = {
  dragType: "card";
  pointerId: number;
  cardId: string;
  columnId: string;
  index: number;
  startX: number;
  startY: number;
  grabOffsetX: number;
  grabOffsetY: number;
  width: number;
  height: number;
};

export type PendingColumnPointer = {
  dragType: "column";
  pointerId: number;
  columnId: string;
  sourceIndex: number;
  startX: number;
  startY: number;
  grabOffsetX: number;
  grabOffsetY: number;
  width: number;
  height: number;
};

export type PendingPointer = PendingCardPointer | PendingColumnPointer;

/** Map post-removal insert index to the visual slot among still-rendered columns. */
export function columnIndicatorDisplayIndex(
  columnDrag: ColumnDragState | null
): number | null {
  if (columnDrag == null) {
    return null;
  }
  return columnDrag.insertIndex >= columnDrag.sourceIndex
    ? columnDrag.insertIndex + 1
    : columnDrag.insertIndex;
}
