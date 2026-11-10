"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { GripVerticalIcon, LayersIcon, PlusIcon } from "lucide-react";
import {
  reorderStagesAction,
  saveSubjectBoardAction,
} from "@/app/manager/subjects/actions";
import { Can } from "@/components/auth/can";
import { SubjectCard } from "@/components/manager/subjects/subject-card";
import { EmptyState } from "@/components/ui/empty-state";
import { useFormActionState } from "@/hooks/use-form-action-state";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { useHorizontalDragScroll } from "@/hooks/use-horizontal-drag-scroll";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getManagerSubjectDetailRoute } from "@/lib/constants/routes";
import { UNASSIGNED_STAGE_ID } from "@/lib/constants/subject-stage";
import {
  findColumnInsertIndex,
  findInsertIndex,
  findTargetColumnId,
  measureColumnRanges,
} from "@/lib/subjects/kanban-pointer-hit-test";
import {
  applyStageOrder,
  applySubjectBoardColumns,
  buildSubjectBoardColumns,
  commitStageColumnMove,
  commitSubjectCardMove,
  type SubjectBoardColumns,
} from "@/lib/subjects/subject-board-state";
import { cn } from "@/lib/utils";
import type {
  ManagerStageRow,
  ReorderStagesActionState,
  SaveSubjectBoardActionState,
} from "@/types/manager-stage";
import type { ManagerSubjectRow } from "@/types/manager-subject";

const CARD_DRAG_THRESHOLD_PX = 5;
const EDGE_SCROLL_ZONE_PX = 60;
const EDGE_SCROLL_MAX_SPEED = 28;
const COLUMN_OVERLAY_PREVIEW_CARDS = 3;

const emptySubscribe = () => () => {};

function useHasMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

type CardDragState = {
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

type ColumnDragState = {
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

type BoardDragState = CardDragState | ColumnDragState;

type PendingCardPointer = {
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

type PendingColumnPointer = {
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

type PendingPointer = PendingCardPointer | PendingColumnPointer;

function CardDropIndicator() {
  return (
    <div className="relative my-0.5 h-0 w-full shrink-0" aria-hidden>
      <div className="absolute inset-x-1 top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]" />
      <div className="absolute top-1/2 left-0 size-2 -translate-y-1/2 rounded-full bg-primary" />
      <div className="absolute top-1/2 right-0 size-2 -translate-y-1/2 rounded-full bg-primary" />
    </div>
  );
}

function ColumnDropIndicator() {
  return (
    <div
      className="relative w-0 shrink-0 self-stretch"
      aria-hidden
    >
      <div className="absolute top-0 bottom-0 left-1/2 w-[3px] -translate-x-1/2 rounded-full bg-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]" />
      <div className="absolute top-0 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
      <div className="absolute bottom-0 left-1/2 size-2 -translate-x-1/2 translate-y-1/2 rounded-full bg-primary" />
    </div>
  );
}

type StageColumnProps = {
  columnId: string;
  title: string;
  description?: string;
  subjects: ManagerSubjectRow[];
  canDragCards: boolean;
  dragDisabled?: boolean;
  columnDraggable?: boolean;
  isCardDropTarget?: boolean;
  isColumnDragging?: boolean;
  cardDragState: CardDragState | null;
  columnRef: (element: HTMLElement | null) => void;
  listRef: (element: HTMLElement | null) => void;
  onCardPointerDown: (
    event: ReactPointerEvent<HTMLDivElement>,
    subject: ManagerSubjectRow,
    columnId: string,
    index: number
  ) => void;
  onColumnHeaderPointerDown?: (
    event: ReactPointerEvent<HTMLElement>,
    columnId: string
  ) => void;
};

function StageColumn({
  columnId,
  title,
  description,
  subjects,
  canDragCards,
  dragDisabled = false,
  columnDraggable = false,
  isCardDropTarget = false,
  isColumnDragging = false,
  cardDragState,
  columnRef,
  listRef,
  onCardPointerDown,
  onColumnHeaderPointerDown,
}: StageColumnProps) {
  const showCardIndicator = cardDragState?.targetColumnId === columnId;
  const insertIndex = cardDragState?.insertIndex ?? 0;
  const draggingId = cardDragState?.draggingCardId ?? null;

  const cards: ReactNode[] = [];
  subjects.forEach((subject, index) => {
    if (showCardIndicator && insertIndex === index) {
      cards.push(<CardDropIndicator key={`indicator-${columnId}-${index}`} />);
    }

    const isDraggingCard = draggingId === subject.id;
    cards.push(
      <div
        key={subject.id}
        data-kanban-no-pan=""
        data-kanban-card=""
        data-card-id={subject.id}
        className={cn(
          "touch-none transition-[transform,opacity,margin] duration-150 ease-out",
          canDragCards && !dragDisabled ? "cursor-grab" : "cursor-default",
          isDraggingCard && "opacity-35"
        )}
        onPointerDown={(event) => {
          if (!canDragCards || dragDisabled) {
            return;
          }
          onCardPointerDown(event, subject, columnId, index);
        }}
      >
        <SubjectCard
          subject={subject}
          linkToDetail={!canDragCards || dragDisabled}
          className={cn(
            canDragCards && !dragDisabled && "hover:border-primary/40"
          )}
        />
      </div>
    );
  });

  if (
    showCardIndicator &&
    (subjects.length === 0 || insertIndex >= subjects.length)
  ) {
    cards.push(<CardDropIndicator key={`indicator-${columnId}-end`} />);
  }

  return (
    <section
      ref={columnRef}
      data-kanban-column={columnId}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-xl border bg-card/80 transition-[colors,opacity] duration-150",
        isCardDropTarget && "border-primary bg-primary/5",
        isColumnDragging && "opacity-35"
      )}
    >
      <header
        data-kanban-column-header=""
        data-kanban-no-pan=""
        className={cn(
          "border-b px-3 py-3",
          columnDraggable &&
            !dragDisabled &&
            "cursor-grab active:cursor-grabbing"
        )}
        onPointerDown={
          columnDraggable && onColumnHeaderPointerDown
            ? (event) => onColumnHeaderPointerDown(event, columnId)
            : undefined
        }
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-1.5">
            {columnDraggable ? (
              <GripVerticalIcon
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
            ) : null}
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold tracking-tight">
                {title}
              </h3>
              {description ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
          <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
            {subjects.length}
          </span>
        </div>
      </header>
      <div
        ref={listRef}
        data-kanban-column-list={columnId}
        className="flex max-h-[min(70vh,42rem)] flex-col gap-3 overflow-y-auto p-3"
      >
        {subjects.length === 0 && !showCardIndicator ? (
          <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
            Drop subjects here
          </p>
        ) : (
          cards
        )}
      </div>
    </section>
  );
}

type SubjectsKanbanBoardProps = {
  subjects: ManagerSubjectRow[];
  stages: ManagerStageRow[];
  canDragCards: boolean;
  canReorderColumns: boolean;
  sortingEnabled: boolean;
  onSubjectsChange: (subjects: ManagerSubjectRow[]) => void;
  onStagesChange: (stages: ManagerStageRow[]) => void;
  onRequestCreateStage: () => void;
};

export function SubjectsKanbanBoard({
  subjects,
  stages,
  canDragCards,
  canReorderColumns,
  sortingEnabled,
  onSubjectsChange,
  onStagesChange,
  onRequestCreateStage,
}: SubjectsKanbanBoardProps) {
  const mounted = useHasMounted();
  const router = useRouter();
  const [columns, setColumns] = useState<SubjectBoardColumns>(() =>
    buildSubjectBoardColumns(subjects, stages)
  );
  const [columnOrder, setColumnOrder] = useState(() =>
    [...stages]
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((stage) => stage.id)
  );
  const [prevSubjects, setPrevSubjects] = useState(subjects);
  const [prevStages, setPrevStages] = useState(stages);
  const [dragState, setDragState] = useState<BoardDragState | null>(null);
  const [gestureActive, setGestureActive] = useState(false);

  const [optimisticColumns, applyOptimisticColumns] = useOptimistic(
    columns,
    (_current: SubjectBoardColumns, next: SubjectBoardColumns) => next
  );
  const [optimisticColumnOrder, applyOptimisticColumnOrder] = useOptimistic(
    columnOrder,
    (_current: string[], next: string[]) => next
  );

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
  const boardRollbackRef = useRef<{
    columns: SubjectBoardColumns;
    subjects: ManagerSubjectRow[];
  } | null>(null);
  const stagesRollbackRef = useRef<{
    order: string[];
    stages: ManagerStageRow[];
  } | null>(null);

  const subjectsById = useMemo(() => {
    const map = new Map<string, ManagerSubjectRow>();
    for (const subject of subjects) {
      map.set(subject.id, subject);
    }
    return map;
  }, [subjects]);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  useEffect(() => {
    columnOrderRef.current = columnOrder;
  }, [columnOrder]);

  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  const [isBoardPending, startBoardTransition] = useTransition();
  const [isStagesPending, startStagesTransition] = useTransition();
  const [boardState, boardAction, isBoardActionPending] = useFormActionState(
    saveSubjectBoardAction,
    {} as SaveSubjectBoardActionState
  );
  const [stagesState, stagesAction, isStagesActionPending] = useFormActionState(
    reorderStagesAction,
    {} as ReorderStagesActionState
  );

  const isPending =
    isBoardPending ||
    isStagesPending ||
    isBoardActionPending ||
    isStagesActionPending;

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

  useActionStateToast(boardState, isBoardPending || isBoardActionPending);
  useActionStateToast(stagesState, isStagesPending || isStagesActionPending);

  useActionStateSuccess(
    boardState,
    isBoardPending || isBoardActionPending,
    () => {
      boardRollbackRef.current = null;
    }
  );
  useActionStateSuccess(
    boardState,
    isBoardPending || isBoardActionPending,
    () => {
      const rollback = boardRollbackRef.current;
      boardRollbackRef.current = null;
      if (!rollback) {
        return;
      }
      setColumns(rollback.columns);
      columnsRef.current = rollback.columns;
      onSubjectsChange(rollback.subjects);
    },
    (state) => state.success === false
  );

  useActionStateSuccess(
    stagesState,
    isStagesPending || isStagesActionPending,
    (state) => {
      stagesRollbackRef.current = null;
      if (state.stages) {
        onStagesChange(state.stages);
        setColumnOrder(
          [...state.stages]
            .sort((left, right) => left.sort_order - right.sort_order)
            .map((stage) => stage.id)
        );
      }
    }
  );
  useActionStateSuccess(
    stagesState,
    isStagesPending || isStagesActionPending,
    () => {
      const rollback = stagesRollbackRef.current;
      stagesRollbackRef.current = null;
      if (!rollback) {
        return;
      }
      setColumnOrder(rollback.order);
      columnOrderRef.current = rollback.order;
      onStagesChange(rollback.stages);
    },
    (state) => state.success === false
  );

  useEffect(() => {
    refreshOverflow();
  }, [optimisticColumns, optimisticColumnOrder, stages.length, subjects.length, refreshOverflow]);

  if (subjects !== prevSubjects || stages !== prevStages) {
    setPrevSubjects(subjects);
    setPrevStages(stages);
    setColumns(buildSubjectBoardColumns(subjects, stages));
    setColumnOrder(
      [...stages]
        .sort((left, right) => left.sort_order - right.sort_order)
        .map((stage) => stage.id)
    );
  }

  const persistColumns = useCallback(
    (nextColumns: SubjectBoardColumns) => {
      const nextSubjects = applySubjectBoardColumns(subjects, nextColumns);
      boardRollbackRef.current = {
        columns: columnsRef.current,
        subjects,
      };

      const formData = new FormData();
      formData.set("columns", JSON.stringify(nextColumns));

      startBoardTransition(() => {
        applyOptimisticColumns(nextColumns);
        setColumns(nextColumns);
        columnsRef.current = nextColumns;
        onSubjectsChange(nextSubjects);
        boardAction(formData);
      });
    },
    [
      subjects,
      onSubjectsChange,
      boardAction,
      startBoardTransition,
      applyOptimisticColumns,
    ]
  );

  const persistStageOrder = useCallback(
    (orderedIds: string[]) => {
      const nextStages = applyStageOrder(stages, orderedIds);
      stagesRollbackRef.current = {
        order: columnOrderRef.current,
        stages,
      };

      const formData = new FormData();
      formData.set("ordered_ids", JSON.stringify(orderedIds));

      startStagesTransition(() => {
        applyOptimisticColumnOrder(orderedIds);
        setColumnOrder(orderedIds);
        columnOrderRef.current = orderedIds;
        onStagesChange(nextStages);
        stagesAction(formData);
      });
    },
    [
      stages,
      onStagesChange,
      stagesAction,
      startStagesTransition,
      applyOptimisticColumnOrder,
    ]
  );

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

      const ranges = measureColumnRanges(columnElementsRef.current);
      const targetColumnId = findTargetColumnId(pointerX, ranges);
      if (!targetColumnId) {
        return;
      }

      const list = listElementsRef.current.get(targetColumnId);
      const cardNodes = list
        ? Array.from(
            list.querySelectorAll<HTMLElement>("[data-kanban-card][data-card-id]")
          ).filter((node) => node.dataset.cardId !== current.draggingCardId)
        : [];

      const insertIndex = findInsertIndex(
        pointerY,
        cardNodes.map((node) => {
          const rect = node.getBoundingClientRect();
          return { top: rect.top, height: rect.height };
        })
      );

      setDragState((prev) => {
        if (!prev || prev.dragType !== "card") {
          return prev;
        }
        if (
          prev.targetColumnId === targetColumnId &&
          prev.insertIndex === insertIndex &&
          prev.pointerX === pointerX &&
          prev.pointerY === pointerY
        ) {
          return prev;
        }
        const next: CardDragState = {
          ...prev,
          targetColumnId,
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

  const recomputeColumnHitTest = useCallback((pointerX: number, pointerY: number) => {
    const current = dragStateRef.current;
    if (!current || current.dragType !== "column") {
      return;
    }

    const order = columnOrderRef.current;
    const rects: { left: number; width: number }[] = [];
    for (const id of order) {
      if (id === current.draggingColumnId) {
        continue;
      }
      const element = columnElementsRef.current.get(id);
      if (!element) {
        continue;
      }
      const rect = element.getBoundingClientRect();
      rects.push({ left: rect.left, width: rect.width });
    }

    const insertIndex = findColumnInsertIndex(pointerX, rects);

    setDragState((prev) => {
      if (!prev || prev.dragType !== "column") {
        return prev;
      }
      if (
        prev.insertIndex === insertIndex &&
        prev.pointerX === pointerX &&
        prev.pointerY === pointerY
      ) {
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
  }, []);

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
    const boardRect = board.getBoundingClientRect();
    let scrolled = false;

    const distLeft = x - boardRect.left;
    const distRight = boardRect.right - x;
    if (distLeft >= 0 && distLeft < EDGE_SCROLL_ZONE_PX) {
      board.scrollLeft -=
        EDGE_SCROLL_MAX_SPEED * (1 - distLeft / EDGE_SCROLL_ZONE_PX);
      scrolled = true;
    } else if (distRight >= 0 && distRight < EDGE_SCROLL_ZONE_PX) {
      board.scrollLeft +=
        EDGE_SCROLL_MAX_SPEED * (1 - distRight / EDGE_SCROLL_ZONE_PX);
      scrolled = true;
    }

    if (current.dragType === "card") {
      const list = listElementsRef.current.get(current.targetColumnId);
      if (list && list.scrollHeight > list.clientHeight) {
        const listRect = list.getBoundingClientRect();
        const distTop = y - listRect.top;
        const distBottom = listRect.bottom - y;
        if (distTop >= 0 && distTop < EDGE_SCROLL_ZONE_PX) {
          list.scrollTop -=
            EDGE_SCROLL_MAX_SPEED * (1 - distTop / EDGE_SCROLL_ZONE_PX);
          scrolled = true;
        } else if (distBottom >= 0 && distBottom < EDGE_SCROLL_ZONE_PX) {
          list.scrollTop +=
            EDGE_SCROLL_MAX_SPEED * (1 - distBottom / EDGE_SCROLL_ZONE_PX);
          scrolled = true;
        }
      }
    }

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
      if (board) {
        const boardRect = board.getBoundingClientRect();
        const outside =
          clientX < boardRect.left ||
          clientX > boardRect.right ||
          clientY < boardRect.top ||
          clientY > boardRect.bottom;
        if (outside) {
          endGesture();
          return;
        }
      }

      const ranges = measureColumnRanges(columnElementsRef.current);
      const targetColumnId =
        findTargetColumnId(clientX, ranges) ?? current.targetColumnId;
      const list = listElementsRef.current.get(targetColumnId);
      const cardNodes = list
        ? Array.from(
            list.querySelectorAll<HTMLElement>("[data-kanban-card][data-card-id]")
          ).filter((node) => node.dataset.cardId !== current.draggingCardId)
        : [];
      const insertIndex = findInsertIndex(
        clientY,
        cardNodes.map((node) => {
          const rect = node.getBoundingClientRect();
          return { top: rect.top, height: rect.height };
        })
      );

      const next = commitSubjectCardMove(columnsRef.current, {
        sourceColumnId: current.sourceColumnId,
        sourceIndex: current.sourceIndex,
        targetColumnId,
        insertIndex,
      });

      endGesture();

      if (!next) {
        return;
      }

      persistColumns(next);
    },
    [boardScrollRef, endGesture, persistColumns]
  );

  const finishColumnDrag = useCallback(
    (clientX: number, clientY: number) => {
      const current = dragStateRef.current;
      if (!current || current.dragType !== "column") {
        endGesture();
        return;
      }

      const board = boardScrollRef.current;
      if (board) {
        const boardRect = board.getBoundingClientRect();
        const outside =
          clientX < boardRect.left ||
          clientX > boardRect.right ||
          clientY < boardRect.top ||
          clientY > boardRect.bottom;
        if (outside) {
          endGesture();
          return;
        }
      }

      const order = columnOrderRef.current;
      const rects: { left: number; width: number }[] = [];
      for (const id of order) {
        if (id === current.draggingColumnId) {
          continue;
        }
        const element = columnElementsRef.current.get(id);
        if (!element) {
          continue;
        }
        const rect = element.getBoundingClientRect();
        rects.push({ left: rect.left, width: rect.width });
      }
      const insertIndex = findColumnInsertIndex(clientX, rects);

      const next = commitStageColumnMove(order, {
        sourceIndex: current.sourceIndex,
        insertIndex,
      });

      endGesture();

      if (!next) {
        return;
      }

      persistStageOrder(next);
    },
    [boardScrollRef, endGesture, persistStageOrder]
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
          const nextState: CardDragState = {
            dragType: "card",
            draggingCardId: pending.cardId,
            sourceColumnId: pending.columnId,
            sourceIndex: pending.index,
            targetColumnId: pending.columnId,
            insertIndex: pending.index,
            pointerX: event.clientX,
            pointerY: event.clientY,
            overlayWidth: pending.width,
            overlayHeight: pending.height,
            grabOffsetX: pending.grabOffsetX,
            grabOffsetY: pending.grabOffsetY,
          };
          pendingPointerRef.current = null;
          dragStateRef.current = nextState;
          setDragState(nextState);
        } else {
          const nextState: ColumnDragState = {
            dragType: "column",
            draggingColumnId: pending.columnId,
            sourceIndex: pending.sourceIndex,
            insertIndex: pending.sourceIndex,
            pointerX: event.clientX,
            pointerY: event.clientY,
            overlayWidth: pending.width,
            overlayHeight: pending.height,
            grabOffsetX: pending.grabOffsetX,
            grabOffsetY: pending.grabOffsetY,
          };
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
          router.push(getManagerSubjectDetailRoute(pending.cardId));
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
    router,
    stopAutoScroll,
    tickAutoScroll,
  ]);

  const handleCardPointerDown = useCallback(
    (
      event: ReactPointerEvent<HTMLDivElement>,
      subject: ManagerSubjectRow,
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
        cardId: subject.id,
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
      // Capture the whole column shell for a better overlay size.
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

  if (subjects.length === 0 && stages.length === 0) {
    return (
      <EmptyState
        icon={LayersIcon}
        title="No subjects yet"
        description="Create a subject or stage to get started."
      />
    );
  }

  const orderedStages = optimisticColumnOrder
    .map((id) => stages.find((stage) => stage.id === id))
    .filter((stage): stage is ManagerStageRow => Boolean(stage));

  const cardDrag =
    dragState?.dragType === "card" ? dragState : null;
  const columnDrag =
    dragState?.dragType === "column" ? dragState : null;

  const columnIndicatorDisplayIndex =
    columnDrag == null
      ? null
      : columnDrag.insertIndex >= columnDrag.sourceIndex
        ? columnDrag.insertIndex + 1
        : columnDrag.insertIndex;

  const draggingSubject = cardDrag
    ? subjectsById.get(cardDrag.draggingCardId)
    : null;

  const draggingStage = columnDrag
    ? stages.find((stage) => stage.id === columnDrag.draggingColumnId)
    : null;
  const draggingStageSubjects = columnDrag
    ? (optimisticColumns[columnDrag.draggingColumnId] ?? [])
        .map((id) => subjectsById.get(id))
        .filter((row): row is ManagerSubjectRow => Boolean(row))
        .slice(0, COLUMN_OVERLAY_PREVIEW_CARDS)
    : [];

  return (
    <>
      <div
        ref={boardScrollRef}
        {...scrollProps}
        className={cn(
          "flex gap-4 overflow-x-auto pb-2",
          !isPanning && !isBoardDragging && "scroll-smooth",
          isPanning && "cursor-grabbing select-none",
          isBoardDragging && "select-none cursor-grabbing",
          canPan && !isPanning && !isBoardDragging && "cursor-grab",
          canPan && "[&_button]:cursor-pointer"
        )}
      >
        <StageColumn
          columnId={UNASSIGNED_STAGE_ID}
          title="Unassigned"
          description="Subjects without a stage"
          subjects={(optimisticColumns[UNASSIGNED_STAGE_ID] ?? [])
            .map((id) => subjectsById.get(id))
            .filter((row): row is ManagerSubjectRow => Boolean(row))}
          canDragCards={canDragCards && sortingEnabled && mounted}
          dragDisabled={isPending || !sortingEnabled || columnDrag !== null}
          columnDraggable={false}
          isCardDropTarget={cardDrag?.targetColumnId === UNASSIGNED_STAGE_ID}
          cardDragState={cardDrag}
          columnRef={(element) => setColumnNode(UNASSIGNED_STAGE_ID, element)}
          listRef={(element) => setListNode(UNASSIGNED_STAGE_ID, element)}
          onCardPointerDown={handleCardPointerDown}
        />

        {orderedStages.map((stage, stageIndex) => (
          <div key={stage.id} className="contents">
            {columnIndicatorDisplayIndex === stageIndex ? (
              <ColumnDropIndicator />
            ) : null}
            <StageColumn
              columnId={stage.id}
              title={stage.name}
              description={`Level ${stage.level} · Period ${stage.period}`}
              subjects={(optimisticColumns[stage.id] ?? [])
                .map((id) => subjectsById.get(id))
                .filter((row): row is ManagerSubjectRow => Boolean(row))}
              canDragCards={canDragCards && sortingEnabled && mounted}
              dragDisabled={
                isPending || !sortingEnabled || columnDrag !== null
              }
              columnDraggable={canReorderColumns && sortingEnabled && mounted}
              isCardDropTarget={cardDrag?.targetColumnId === stage.id}
              isColumnDragging={columnDrag?.draggingColumnId === stage.id}
              cardDragState={cardDrag}
              columnRef={(element) => setColumnNode(stage.id, element)}
              listRef={(element) => setListNode(stage.id, element)}
              onCardPointerDown={handleCardPointerDown}
              onColumnHeaderPointerDown={handleColumnHeaderPointerDown}
            />
          </div>
        ))}

        {columnIndicatorDisplayIndex !== null &&
        columnIndicatorDisplayIndex >= orderedStages.length ? (
          <ColumnDropIndicator />
        ) : null}

        <Can permission={PERMISSIONS.SUBJECTS_STAGES_CREATE}>
          <button
            type="button"
            onClick={onRequestCreateStage}
            className={cn(
              "flex w-56 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 px-4 py-10 text-muted-foreground transition-colors",
              "hover:border-primary/50 hover:bg-primary/5 hover:text-primary",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
            aria-label="Create stage"
          >
            <span className="inline-flex size-10 items-center justify-center rounded-full border border-dashed border-current">
              <PlusIcon className="size-5" />
            </span>
            <span className="text-sm font-medium">Add stage</span>
          </button>
        </Can>
      </div>

      {mounted && cardDrag && draggingSubject
        ? createPortal(
            <div
              className="pointer-events-none fixed z-[80] rotate-[2deg] opacity-95 shadow-2xl"
              style={{
                left: cardDrag.pointerX - cardDrag.grabOffsetX,
                top: cardDrag.pointerY - cardDrag.grabOffsetY,
                width: cardDrag.overlayWidth,
              }}
            >
              <SubjectCard
                subject={draggingSubject}
                linkToDetail={false}
                className="border-primary/40 bg-card"
              />
            </div>,
            document.body
          )
        : null}

      {mounted && columnDrag && draggingStage
        ? createPortal(
            <div
              className="pointer-events-none fixed z-[80] flex w-72 flex-col overflow-hidden rounded-xl border border-primary/40 bg-card/95 opacity-95 shadow-2xl rotate-[1.5deg]"
              style={{
                left: columnDrag.pointerX - columnDrag.grabOffsetX,
                top: columnDrag.pointerY - columnDrag.grabOffsetY,
                width: columnDrag.overlayWidth,
                maxHeight: columnDrag.overlayHeight,
              }}
            >
              <div className="border-b px-3 py-3">
                <div className="flex items-start gap-1.5">
                  <GripVerticalIcon
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold tracking-tight">
                      {draggingStage.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Level {draggingStage.level} · Period {draggingStage.period}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 p-3">
                {draggingStageSubjects.map((subject) => (
                  <SubjectCard
                    key={subject.id}
                    subject={subject}
                    linkToDetail={false}
                    className="pointer-events-none"
                  />
                ))}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
