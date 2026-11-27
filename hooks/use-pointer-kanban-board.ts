"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { useHorizontalDragScroll } from "@/hooks/use-horizontal-drag-scroll";
import { useHasMounted } from "@/hooks/use-has-mounted";
import {
  commitCardMove,
  commitColumnMove,
  type BoardColumns,
} from "@/lib/kanban/board-state";
import {
  applyPointerEdgeScroll,
  isPointerOutsideElement,
  measureCardDropTarget,
  measureColumnDropTarget,
} from "@/lib/kanban/pointer-board-geometry";
import {
  CARD_DRAG_THRESHOLD_PX,
  columnIndicatorDisplayIndex,
  type BoardDragState,
  type CardDragState,
  type ColumnDragState,
  type PendingPointer,
} from "@/lib/kanban/pointer-drag-types";
import {
  buildCardDragFromPending,
  buildColumnDragFromPending,
  isSameCardDragTarget,
  isSameColumnDragTarget,
} from "@/lib/kanban/pointer-drag-updates";

export type UsePointerKanbanBoardOptions = {
  columns: BoardColumns;
  columnOrder: string[];
  canDragCards: boolean;
  canReorderColumns: boolean;
  sortingEnabled: boolean;
  isPending: boolean;
  onPersistColumns: (next: BoardColumns) => void;
  onPersistColumnOrder: (orderedIds: string[]) => void;
  /** Fired when a card pointer-up happens without crossing the drag threshold. */
  onCardActivate?: (cardId: string) => void;
};

export type UsePointerKanbanBoardResult = {
  mounted: boolean;
  cardDrag: CardDragState | null;
  columnDrag: ColumnDragState | null;
  columnIndicatorDisplayIndex: number | null;
  isBoardDragging: boolean;
  boardScrollRef: RefObject<HTMLDivElement | null>;
  canPan: boolean;
  isPanning: boolean;
  scrollProps: ReturnType<
    typeof useHorizontalDragScroll<HTMLDivElement>
  >["scrollProps"];
  /** Used by optimistic wrapper when column/item counts change. */
  refreshOverflow: () => void;
  setColumnNode: (columnId: string, element: HTMLElement | null) => void;
  setListNode: (columnId: string, element: HTMLElement | null) => void;
  handleCardPointerDown: (
    event: ReactPointerEvent<HTMLDivElement>,
    cardId: string,
    columnId: string,
    index: number
  ) => void;
  handleColumnHeaderPointerDown: (
    event: ReactPointerEvent<HTMLElement>,
    columnId: string
  ) => void;
};

export function usePointerKanbanBoard({
  columns,
  columnOrder,
  canDragCards,
  canReorderColumns,
  sortingEnabled,
  isPending,
  onPersistColumns,
  onPersistColumnOrder,
  onCardActivate,
}: UsePointerKanbanBoardOptions): UsePointerKanbanBoardResult {
  const mounted = useHasMounted();
  const [dragState, setDragState] = useState<BoardDragState | null>(null);
  const [gestureActive, setGestureActive] = useState(false);

  const columnsRef = useRef(columns);
  const columnOrderRef = useRef(columnOrder);
  const dragStateRef = useRef<BoardDragState | null>(null);
  const pendingPointerRef = useRef<PendingPointer | null>(null);
  const pointerCaptureRef = useRef<{
    target: HTMLElement;
    pointerId: number;
  } | null>(null);
  const columnElementsRef = useRef(new Map<string, HTMLElement>());
  const listElementsRef = useRef(new Map<string, HTMLElement>());
  const rafRef = useRef<number | null>(null);
  const autoScrollRafRef = useRef<number | null>(null);
  const tickAutoScrollRef = useRef<() => void>(() => {});
  const latestPointerRef = useRef({ x: 0, y: 0 });
  const onPersistColumnsRef = useRef(onPersistColumns);
  const onPersistColumnOrderRef = useRef(onPersistColumnOrder);
  const onCardActivateRef = useRef(onCardActivate);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  useEffect(() => {
    columnOrderRef.current = columnOrder;
  }, [columnOrder]);

  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  useEffect(() => {
    onPersistColumnsRef.current = onPersistColumns;
  }, [onPersistColumns]);

  useEffect(() => {
    onPersistColumnOrderRef.current = onPersistColumnOrder;
  }, [onPersistColumnOrder]);

  useEffect(() => {
    onCardActivateRef.current = onCardActivate;
  }, [onCardActivate]);

  const isBoardDragging = dragState !== null;

  const {
    ref: boardScrollRef,
    canPan,
    isPanning,
    scrollProps,
    refreshOverflow,
  } = useHorizontalDragScroll<HTMLDivElement>({
    disabled: isBoardDragging,
  });

  const setColumnNode = useCallback(
    (columnId: string, element: HTMLElement | null) => {
      if (element) {
        columnElementsRef.current.set(columnId, element);
      } else {
        columnElementsRef.current.delete(columnId);
      }
    },
    []
  );

  const setListNode = useCallback(
    (columnId: string, element: HTMLElement | null) => {
      if (element) {
        listElementsRef.current.set(columnId, element);
      } else {
        listElementsRef.current.delete(columnId);
      }
    },
    []
  );

  const recomputeCardHitTest = useCallback(
    (pointerX: number, pointerY: number) => {
      const current = dragStateRef.current;
      if (!current || current.dragType !== "card") {
        return;
      }

      const target = measureCardDropTarget(
        pointerX,
        pointerY,
        columnElementsRef.current,
        listElementsRef.current,
        current.draggingCardId
      );
      if (!target) {
        return;
      }

      setDragState((prev) => {
        if (!prev || prev.dragType !== "card") {
          return prev;
        }
        if (
          isSameCardDragTarget(
            prev,
            target.targetColumnId,
            target.insertIndex,
            pointerX,
            pointerY
          )
        ) {
          return prev;
        }
        const next: CardDragState = {
          ...prev,
          targetColumnId: target.targetColumnId,
          insertIndex: target.insertIndex,
          pointerX,
          pointerY,
        };
        dragStateRef.current = next;
        return next;
      });
    },
    []
  );

  const recomputeColumnHitTest = useCallback(
    (pointerX: number, pointerY: number) => {
      const current = dragStateRef.current;
      if (!current || current.dragType !== "column") {
        return;
      }

      const { insertIndex } = measureColumnDropTarget(
        pointerX,
        columnOrderRef.current,
        columnElementsRef.current,
        current.draggingColumnId
      );

      setDragState((prev) => {
        if (!prev || prev.dragType !== "column") {
          return prev;
        }
        if (isSameColumnDragTarget(prev, insertIndex, pointerX, pointerY)) {
          return prev;
        }
        const next: ColumnDragState = {
          ...prev,
          insertIndex,
          pointerX,
          pointerY,
        };
        dragStateRef.current = next;
        return next;
      });
    },
    []
  );

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRafRef.current !== null) {
      cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
  }, []);

  const tickAutoScroll = useCallback(() => {
    const current = dragStateRef.current;
    const board = boardScrollRef.current;
    if (!current || !board) {
      stopAutoScroll();
      return;
    }

    const { x, y } = latestPointerRef.current;
    const list =
      current.dragType === "card"
        ? listElementsRef.current.get(current.targetColumnId)
        : null;

    const scrolled = applyPointerEdgeScroll({
      pointerX: x,
      pointerY: y,
      board,
      list,
    });

    if (scrolled) {
      if (current.dragType === "card") {
        recomputeCardHitTest(x, y);
      } else {
        recomputeColumnHitTest(x, y);
      }
    }

    autoScrollRafRef.current = requestAnimationFrame(() => {
      tickAutoScrollRef.current();
    });
  }, [
    boardScrollRef,
    recomputeCardHitTest,
    recomputeColumnHitTest,
    stopAutoScroll,
  ]);

  useEffect(() => {
    tickAutoScrollRef.current = tickAutoScroll;
  }, [tickAutoScroll]);

  const endGesture = useCallback(() => {
    const capture = pointerCaptureRef.current;
    if (capture?.target.hasPointerCapture?.(capture.pointerId)) {
      try {
        capture.target.releasePointerCapture(capture.pointerId);
      } catch {
        // already released
      }
    }
    pointerCaptureRef.current = null;
    pendingPointerRef.current = null;
    dragStateRef.current = null;
    setDragState(null);
    setGestureActive(false);
    stopAutoScroll();
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
  }, [stopAutoScroll]);

  const finishCardDrag = useCallback(
    (clientX: number, clientY: number) => {
      const current = dragStateRef.current;
      if (!current || current.dragType !== "card") {
        endGesture();
        return;
      }

      const board = boardScrollRef.current;
      if (board && isPointerOutsideElement(clientX, clientY, board)) {
        endGesture();
        return;
      }

      const target = measureCardDropTarget(
        clientX,
        clientY,
        columnElementsRef.current,
        listElementsRef.current,
        current.draggingCardId,
        current.targetColumnId
      );
      if (!target) {
        endGesture();
        return;
      }

      const next = commitCardMove(columnsRef.current, {
        sourceColumnId: current.sourceColumnId,
        sourceIndex: current.sourceIndex,
        targetColumnId: target.targetColumnId,
        insertIndex: target.insertIndex,
      });

      endGesture();

      if (!next) {
        return;
      }

      onPersistColumnsRef.current(next);
    },
    [boardScrollRef, endGesture]
  );

  const finishColumnDrag = useCallback(
    (clientX: number, clientY: number) => {
      const current = dragStateRef.current;
      if (!current || current.dragType !== "column") {
        endGesture();
        return;
      }

      const board = boardScrollRef.current;
      if (board && isPointerOutsideElement(clientX, clientY, board)) {
        endGesture();
        return;
      }

      const order = columnOrderRef.current;
      const { insertIndex } = measureColumnDropTarget(
        clientX,
        order,
        columnElementsRef.current,
        current.draggingColumnId
      );

      const next = commitColumnMove(order, {
        sourceIndex: current.sourceIndex,
        insertIndex,
      });

      endGesture();

      if (!next) {
        return;
      }

      onPersistColumnOrderRef.current(next);
    },
    [boardScrollRef, endGesture]
  );

  useEffect(() => {
    if (!gestureActive) {
      return;
    }

    const onPointerMove = (event: PointerEvent) => {
      latestPointerRef.current = { x: event.clientX, y: event.clientY };

      const pending = pendingPointerRef.current;
      if (pending && !dragStateRef.current) {
        const dx = event.clientX - pending.startX;
        const dy = event.clientY - pending.startY;
        if (Math.hypot(dx, dy) < CARD_DRAG_THRESHOLD_PX) {
          return;
        }

        if (pending.dragType === "card") {
          const nextState = buildCardDragFromPending(
            pending,
            event.clientX,
            event.clientY
          );
          pendingPointerRef.current = null;
          dragStateRef.current = nextState;
          setDragState(nextState);
        } else {
          const nextState = buildColumnDragFromPending(
            pending,
            event.clientX,
            event.clientY
          );
          pendingPointerRef.current = null;
          dragStateRef.current = nextState;
          setDragState(nextState);
        }

        document.body.style.userSelect = "none";
        document.body.style.cursor = "grabbing";
        stopAutoScroll();
        autoScrollRafRef.current = requestAnimationFrame(tickAutoScroll);
      }

      if (!dragStateRef.current) {
        return;
      }

      if (rafRef.current !== null) {
        return;
      }
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const { x, y } = latestPointerRef.current;
        const current = dragStateRef.current;
        if (!current) {
          return;
        }
        if (current.dragType === "card") {
          recomputeCardHitTest(x, y);
        } else {
          recomputeColumnHitTest(x, y);
        }
      });
    };

    const onPointerUp = (event: PointerEvent) => {
      if (pendingPointerRef.current && !dragStateRef.current) {
        const pending = pendingPointerRef.current;
        endGesture();
        if (pending.dragType === "card") {
          onCardActivateRef.current?.(pending.cardId);
        }
        return;
      }

      const current = dragStateRef.current;
      if (current?.dragType === "card") {
        finishCardDrag(event.clientX, event.clientY);
        return;
      }
      if (current?.dragType === "column") {
        finishColumnDrag(event.clientX, event.clientY);
        return;
      }

      endGesture();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        endGesture();
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    gestureActive,
    endGesture,
    finishCardDrag,
    finishColumnDrag,
    recomputeCardHitTest,
    recomputeColumnHitTest,
    stopAutoScroll,
    tickAutoScroll,
  ]);

  const handleCardPointerDown = useCallback(
    (
      event: ReactPointerEvent<HTMLDivElement>,
      cardId: string,
      columnId: string,
      index: number
    ) => {
      if (
        event.button !== 0 ||
        isPending ||
        !sortingEnabled ||
        !canDragCards ||
        dragStateRef.current
      ) {
        return;
      }
      if (
        event.target instanceof Element &&
        event.target.closest("button, a, input, textarea, select")
      ) {
        return;
      }

      const target = event.currentTarget;
      const rect = target.getBoundingClientRect();
      pendingPointerRef.current = {
        dragType: "card",
        pointerId: event.pointerId,
        cardId,
        columnId,
        index,
        startX: event.clientX,
        startY: event.clientY,
        grabOffsetX: event.clientX - rect.left,
        grabOffsetY: event.clientY - rect.top,
        width: rect.width,
        height: rect.height,
      };
      pointerCaptureRef.current = { target, pointerId: event.pointerId };
      latestPointerRef.current = { x: event.clientX, y: event.clientY };
      target.setPointerCapture(event.pointerId);
      setGestureActive(true);
      event.preventDefault();
    },
    [canDragCards, isPending, sortingEnabled]
  );

  const handleColumnHeaderPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>, columnId: string) => {
      if (
        !canReorderColumns ||
        !sortingEnabled ||
        isPending ||
        event.button !== 0 ||
        dragStateRef.current
      ) {
        return;
      }
      if (
        event.target instanceof Element &&
        event.target.closest("button, a, input, textarea, select, [role='menu']")
      ) {
        return;
      }

      const sourceIndex = columnOrderRef.current.indexOf(columnId);
      if (sourceIndex < 0) {
        return;
      }

      const target = event.currentTarget;
      const columnElement = columnElementsRef.current.get(columnId) ?? target;
      const rect = columnElement.getBoundingClientRect();

      pendingPointerRef.current = {
        dragType: "column",
        pointerId: event.pointerId,
        columnId,
        sourceIndex,
        startX: event.clientX,
        startY: event.clientY,
        grabOffsetX: event.clientX - rect.left,
        grabOffsetY: event.clientY - rect.top,
        width: rect.width,
        height: Math.min(rect.height, 220),
      };
      pointerCaptureRef.current = { target, pointerId: event.pointerId };
      latestPointerRef.current = { x: event.clientX, y: event.clientY };
      target.setPointerCapture(event.pointerId);
      setGestureActive(true);
      event.preventDefault();
      event.stopPropagation();
    },
    [canReorderColumns, sortingEnabled, isPending]
  );

  const cardDrag = dragState?.dragType === "card" ? dragState : null;
  const columnDrag = dragState?.dragType === "column" ? dragState : null;

  return {
    mounted,
    cardDrag,
    columnDrag,
    columnIndicatorDisplayIndex: columnIndicatorDisplayIndex(columnDrag),
    isBoardDragging,
    boardScrollRef,
    canPan,
    isPanning,
    scrollProps,
    refreshOverflow,
    setColumnNode,
    setListNode,
    handleCardPointerDown,
    handleColumnHeaderPointerDown,
  };
}
