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
  reorderSemesterTeamsAction,
  saveSemesterBoardAction,
} from "@/app/manager/semesters/actions";
import { Can } from "@/components/auth/can";
import { PhaseCard } from "@/components/manager/phases/phase-card";
import { EmptyState } from "@/components/ui/empty-state";
import { useFormActionState } from "@/hooks/use-form-action-state";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { useHorizontalDragScroll } from "@/hooks/use-horizontal-drag-scroll";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getManagerSemesterDetailRoute } from "@/lib/constants/routes";
import { UNASSIGNED_TEAM_ID } from "@/lib/constants/semester-team";
import {
  findColumnInsertIndex,
  findInsertIndex,
  findTargetColumnId,
  measureColumnRanges,
} from "@/lib/subjects/kanban-pointer-hit-test";
import {
  applyTeamOrder,
  applySemesterBoardColumns,
  buildSemesterBoardColumns,
  commitTeamColumnMove,
  commitSemesterCardMove,
  type SemesterBoardColumns,
} from "@/lib/semesters/semester-board-state";
import { cn } from "@/lib/utils";
import type {
  ManagerSemesterTeamRow,
  ReorderSemesterTeamsActionState,
  SaveSemesterBoardActionState,
} from "@/types/manager-semester-team";
import type { ManagerSemesterRow } from "@/types/manager-phase";

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
  semesters: ManagerSemesterRow[];
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
    semester: ManagerSemesterRow,
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
  semesters,
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
  semesters.forEach((semester, index) => {
    if (showCardIndicator && insertIndex === index) {
      cards.push(<CardDropIndicator key={`indicator-${columnId}-${index}`} />);
    }

    const isDraggingCard = draggingId === semester.id;
    cards.push(
      <div
        key={semester.id}
        data-kanban-no-pan=""
        data-kanban-card=""
        data-card-id={semester.id}
        className={cn(
          "touch-none transition-[transform,opacity,margin] duration-150 ease-out",
          canDragCards && !dragDisabled ? "cursor-grab" : "cursor-default",
          isDraggingCard && "opacity-35"
        )}
        onPointerDown={(event) => {
          if (!canDragCards || dragDisabled) {
            return;
          }
          onCardPointerDown(event, semester, columnId, index);
        }}
      >
        <PhaseCard
          phase={semester}
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
    (semesters.length === 0 || insertIndex >= semesters.length)
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
            {semesters.length}
          </span>
        </div>
      </header>
      <div
        ref={listRef}
        data-kanban-column-list={columnId}
        className="flex max-h-[min(70vh,42rem)] flex-col gap-3 overflow-y-auto p-3"
      >
        {semesters.length === 0 && !showCardIndicator ? (
          <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
            Drop semesters here
          </p>
        ) : (
          cards
        )}
      </div>
    </section>
  );
}

type SemestersKanbanBoardProps = {
  semesters: ManagerSemesterRow[];
  teams: ManagerSemesterTeamRow[];
  canDragCards: boolean;
  canReorderTeams: boolean;
  sortingEnabled: boolean;
  onSemestersChange: (semesters: ManagerSemesterRow[]) => void;
  onTeamsChange: (teams: ManagerSemesterTeamRow[]) => void;
  onRequestCreateTeam: () => void;
};

export function SemestersKanbanBoard({
  semesters,
  teams,
  canDragCards,
  canReorderTeams,
  sortingEnabled,
  onSemestersChange,
  onTeamsChange,
  onRequestCreateTeam,
}: SemestersKanbanBoardProps) {
  const mounted = useHasMounted();
  const router = useRouter();
  const [columns, setColumns] = useState<SemesterBoardColumns>(() =>
    buildSemesterBoardColumns(semesters, teams)
  );
  const [columnOrder, setColumnOrder] = useState(() =>
    [...teams]
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((team) => team.id)
  );
  const [prevSemesters, setPrevSemesters] = useState(semesters);
  const [prevTeams, setPrevTeams] = useState(teams);
  const [dragState, setDragState] = useState<BoardDragState | null>(null);
  const [gestureActive, setGestureActive] = useState(false);

  const [optimisticColumns, applyOptimisticColumns] = useOptimistic(
    columns,
    (_current: SemesterBoardColumns, next: SemesterBoardColumns) => next
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
    columns: SemesterBoardColumns;
    semesters: ManagerSemesterRow[];
  } | null>(null);
  const teamsRollbackRef = useRef<{
    order: string[];
    teams: ManagerSemesterTeamRow[];
  } | null>(null);

  const semestersById = useMemo(() => {
    const map = new Map<string, ManagerSemesterRow>();
    for (const semester of semesters) {
      map.set(semester.id, semester);
    }
    return map;
  }, [semesters]);

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
    saveSemesterBoardAction,
    {} as SaveSemesterBoardActionState
  );
  const [stagesState, stagesAction, isStagesActionPending] = useFormActionState(
    reorderSemesterTeamsAction,
    {} as ReorderSemesterTeamsActionState
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
      onSemestersChange(rollback.semesters);
    },
    (state) => state.success === false
  );

  useActionStateSuccess(
    stagesState,
    isStagesPending || isStagesActionPending,
    (state) => {
      teamsRollbackRef.current = null;
      if (state.teams) {
        onTeamsChange(state.teams);
        setColumnOrder(
          [...state.teams]
            .sort((left, right) => left.sort_order - right.sort_order)
            .map((team) => team.id)
        );
      }
    }
  );
  useActionStateSuccess(
    stagesState,
    isStagesPending || isStagesActionPending,
    () => {
      const rollback = teamsRollbackRef.current;
      teamsRollbackRef.current = null;
      if (!rollback) {
        return;
      }
      setColumnOrder(rollback.order);
      columnOrderRef.current = rollback.order;
      onTeamsChange(rollback.teams);
    },
    (state) => state.success === false
  );

  useEffect(() => {
    refreshOverflow();
  }, [optimisticColumns, optimisticColumnOrder, teams.length, semesters.length, refreshOverflow]);

  if (semesters !== prevSemesters || teams !== prevTeams) {
    setPrevSemesters(semesters);
    setPrevTeams(teams);
    setColumns(buildSemesterBoardColumns(semesters, teams));
    setColumnOrder(
      [...teams]
        .sort((left, right) => left.sort_order - right.sort_order)
        .map((team) => team.id)
    );
  }

  const persistColumns = useCallback(
    (nextColumns: SemesterBoardColumns) => {
      const nextSemesters = applySemesterBoardColumns(semesters, nextColumns);
      boardRollbackRef.current = {
        columns: columnsRef.current,
        semesters,
      };

      const formData = new FormData();
      formData.set("columns", JSON.stringify(nextColumns));

      startBoardTransition(() => {
        applyOptimisticColumns(nextColumns);
        setColumns(nextColumns);
        columnsRef.current = nextColumns;
        onSemestersChange(nextSemesters);
        boardAction(formData);
      });
    },
    [
      semesters,
      onSemestersChange,
      boardAction,
      startBoardTransition,
      applyOptimisticColumns,
    ]
  );

  const persistStageOrder = useCallback(
    (orderedIds: string[]) => {
      const nextStages = applyTeamOrder(teams, orderedIds);
      teamsRollbackRef.current = {
        order: columnOrderRef.current,
        teams,
      };

      const formData = new FormData();
      formData.set("ordered_ids", JSON.stringify(orderedIds));

      startStagesTransition(() => {
        applyOptimisticColumnOrder(orderedIds);
        setColumnOrder(orderedIds);
        columnOrderRef.current = orderedIds;
        onTeamsChange(nextStages);
        stagesAction(formData);
      });
    },
    [
      teams,
      onTeamsChange,
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

      const next = commitSemesterCardMove(columnsRef.current, {
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

      const next = commitTeamColumnMove(order, {
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
          router.push(getManagerSemesterDetailRoute(pending.cardId));
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
      semester: ManagerSemesterRow,
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
        cardId: semester.id,
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
        !canReorderTeams ||
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
    [canReorderTeams, sortingEnabled, isPending]
  );

  if (semesters.length === 0 && teams.length === 0) {
    return (
      <EmptyState
        icon={LayersIcon}
        title="No semesters yet"
        description="Create a semester or team to get started."
      />
    );
  }

  const orderedTeams = optimisticColumnOrder
    .map((id) => teams.find((team) => team.id === id))
    .filter((team): team is ManagerSemesterTeamRow => Boolean(team));

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

  const draggingSemester = cardDrag
    ? semestersById.get(cardDrag.draggingCardId)
    : null;

  const draggingTeam = columnDrag
    ? teams.find((team) => team.id === columnDrag.draggingColumnId)
    : null;
  const draggingTeamSemesters = columnDrag
    ? (optimisticColumns[columnDrag.draggingColumnId] ?? [])
        .map((id) => semestersById.get(id))
        .filter((row): row is ManagerSemesterRow => Boolean(row))
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
          columnId={UNASSIGNED_TEAM_ID}
          title="Unassigned"
          description="Semesters without a team"
          semesters={(optimisticColumns[UNASSIGNED_TEAM_ID] ?? [])
            .map((id) => semestersById.get(id))
            .filter((row): row is ManagerSemesterRow => Boolean(row))}
          canDragCards={canDragCards && sortingEnabled && mounted}
          dragDisabled={isPending || !sortingEnabled || columnDrag !== null}
          columnDraggable={false}
          isCardDropTarget={cardDrag?.targetColumnId === UNASSIGNED_TEAM_ID}
          cardDragState={cardDrag}
          columnRef={(element) => setColumnNode(UNASSIGNED_TEAM_ID, element)}
          listRef={(element) => setListNode(UNASSIGNED_TEAM_ID, element)}
          onCardPointerDown={handleCardPointerDown}
        />

        {orderedTeams.map((team, teamIndex) => (
          <div key={team.id} className="contents">
            {columnIndicatorDisplayIndex === teamIndex ? (
              <ColumnDropIndicator />
            ) : null}
            <StageColumn
              columnId={team.id}
              title={team.name}
              description="Organizer team"
              semesters={(optimisticColumns[team.id] ?? [])
                .map((id) => semestersById.get(id))
                .filter((row): row is ManagerSemesterRow => Boolean(row))}
              canDragCards={canDragCards && sortingEnabled && mounted}
              dragDisabled={
                isPending || !sortingEnabled || columnDrag !== null
              }
              columnDraggable={canReorderTeams && sortingEnabled && mounted}
              isCardDropTarget={cardDrag?.targetColumnId === team.id}
              isColumnDragging={columnDrag?.draggingColumnId === team.id}
              cardDragState={cardDrag}
              columnRef={(element) => setColumnNode(team.id, element)}
              listRef={(element) => setListNode(team.id, element)}
              onCardPointerDown={handleCardPointerDown}
              onColumnHeaderPointerDown={handleColumnHeaderPointerDown}
            />
          </div>
        ))}

        {columnIndicatorDisplayIndex !== null &&
        columnIndicatorDisplayIndex >= orderedTeams.length ? (
          <ColumnDropIndicator />
        ) : null}

        <Can permission={PERMISSIONS.SEMESTERS_TEAMS_CREATE}>
          <button
            type="button"
            onClick={onRequestCreateTeam}
            className={cn(
              "flex w-56 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 px-4 py-10 text-muted-foreground transition-colors",
              "hover:border-primary/50 hover:bg-primary/5 hover:text-primary",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
            aria-label="Create team"
          >
            <span className="inline-flex size-10 items-center justify-center rounded-full border border-dashed border-current">
              <PlusIcon className="size-5" />
            </span>
            <span className="text-sm font-medium">Add team</span>
          </button>
        </Can>
      </div>

      {mounted && cardDrag && draggingSemester
        ? createPortal(
            <div
              className="pointer-events-none fixed z-[80] rotate-[2deg] opacity-95 shadow-2xl"
              style={{
                left: cardDrag.pointerX - cardDrag.grabOffsetX,
                top: cardDrag.pointerY - cardDrag.grabOffsetY,
                width: cardDrag.overlayWidth,
              }}
            >
              <PhaseCard
                phase={draggingSemester}
                linkToDetail={false}
                className="border-primary/40 bg-card"
              />
            </div>,
            document.body
          )
        : null}

      {mounted && columnDrag && draggingTeam
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
                      {draggingTeam.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Organizer team
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 p-3">
                {draggingTeamSemesters.map((semester) => (
                  <PhaseCard
                    key={semester.id}
                    phase={semester}
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
