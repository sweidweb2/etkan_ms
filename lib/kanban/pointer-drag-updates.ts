import type {
  CardDragState,
  ColumnDragState,
  PendingPointer,
} from "@/lib/kanban/pointer-drag-types";

export function buildCardDragFromPending(
  pending: Extract<PendingPointer, { dragType: "card" }>,
  pointerX: number,
  pointerY: number
): CardDragState {
  return {
    dragType: "card",
    draggingCardId: pending.cardId,
    sourceColumnId: pending.columnId,
    sourceIndex: pending.index,
    targetColumnId: pending.columnId,
    insertIndex: pending.index,
    pointerX,
    pointerY,
    overlayWidth: pending.width,
    overlayHeight: pending.height,
    grabOffsetX: pending.grabOffsetX,
    grabOffsetY: pending.grabOffsetY,
  };
}

export function buildColumnDragFromPending(
  pending: Extract<PendingPointer, { dragType: "column" }>,
  pointerX: number,
  pointerY: number
): ColumnDragState {
  return {
    dragType: "column",
    draggingColumnId: pending.columnId,
    sourceIndex: pending.sourceIndex,
    insertIndex: pending.sourceIndex,
    pointerX,
    pointerY,
    overlayWidth: pending.width,
    overlayHeight: pending.height,
    grabOffsetX: pending.grabOffsetX,
    grabOffsetY: pending.grabOffsetY,
  };
}

export function isSameCardDragTarget(
  prev: CardDragState,
  targetColumnId: string,
  insertIndex: number,
  pointerX: number,
  pointerY: number
): boolean {
  return (
    prev.targetColumnId === targetColumnId &&
    prev.insertIndex === insertIndex &&
    prev.pointerX === pointerX &&
    prev.pointerY === pointerY
  );
}

export function isSameColumnDragTarget(
  prev: ColumnDragState,
  insertIndex: number,
  pointerX: number,
  pointerY: number
): boolean {
  return (
    prev.insertIndex === insertIndex &&
    prev.pointerX === pointerX &&
    prev.pointerY === pointerY
  );
}
