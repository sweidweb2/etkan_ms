"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useFormActionState } from "@/hooks/use-form-action-state";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import {
  usePointerKanbanBoard,
  type UsePointerKanbanBoardResult,
} from "@/hooks/use-pointer-kanban-board";
import type { BoardColumns } from "@/lib/kanban/board-state";

type ActionState = {
  success?: boolean;
};

export type OptimisticKanbanGroupBase = {
  id: string;
  sort_order: number;
};

export type OptimisticKanbanItemBase = {
  id: string;
};

export type UseOptimisticKanbanBoardOptions<
  TItem extends OptimisticKanbanItemBase,
  TGroup extends OptimisticKanbanGroupBase,
  TBoardState extends ActionState,
  TReorderState extends ActionState,
> = {
  items: TItem[];
  groups: TGroup[];
  canDragCards: boolean;
  canReorderColumns: boolean;
  sortingEnabled: boolean;
  onItemsChange: (items: TItem[]) => void;
  onGroupsChange: (groups: TGroup[]) => void;
  buildColumns: (items: TItem[], groups: TGroup[]) => BoardColumns;
  applyItemColumns: (items: TItem[], columns: BoardColumns) => TItem[];
  applyGroupOrder: (groups: TGroup[], orderedIds: string[]) => TGroup[];
  saveBoardAction: (
    prev: TBoardState,
    formData: FormData
  ) => Promise<TBoardState>;
  reorderGroupsAction: (
    prev: TReorderState,
    formData: FormData
  ) => Promise<TReorderState>;
  getGroupsFromReorderState: (state: TReorderState) => TGroup[] | undefined;
  onCardActivate?: (cardId: string) => void;
};

/** View-facing board session — no raw optimistic maps or pointer internals. */
export type UseOptimisticKanbanBoardResult<
  TItem extends OptimisticKanbanItemBase,
  TGroup extends OptimisticKanbanGroupBase,
> = {
  isPending: boolean;
  mounted: boolean;
  itemsById: Map<string, TItem>;
  orderedGroups: TGroup[];
  cardDrag: UsePointerKanbanBoardResult["cardDrag"];
  columnDrag: UsePointerKanbanBoardResult["columnDrag"];
  columnIndicatorDisplayIndex: UsePointerKanbanBoardResult["columnIndicatorDisplayIndex"];
  isBoardDragging: boolean;
  boardScrollRef: UsePointerKanbanBoardResult["boardScrollRef"];
  canPan: boolean;
  isPanning: boolean;
  scrollProps: UsePointerKanbanBoardResult["scrollProps"];
  setColumnNode: UsePointerKanbanBoardResult["setColumnNode"];
  setListNode: UsePointerKanbanBoardResult["setListNode"];
  handleColumnHeaderPointerDown: UsePointerKanbanBoardResult["handleColumnHeaderPointerDown"];
  handleColumnCardPointerDown: (
    event: ReactPointerEvent<HTMLDivElement>,
    item: TItem,
    columnId: string,
    index: number
  ) => void;
  getColumnItems: (columnId: string) => TItem[];
};

function sortedGroupIds<TGroup extends OptimisticKanbanGroupBase>(
  groups: readonly TGroup[]
) {
  return [...groups]
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((group) => group.id);
}

export function useOptimisticKanbanBoard<
  TItem extends OptimisticKanbanItemBase,
  TGroup extends OptimisticKanbanGroupBase,
  TBoardState extends ActionState,
  TReorderState extends ActionState,
>({
  items,
  groups,
  canDragCards,
  canReorderColumns,
  sortingEnabled,
  onItemsChange,
  onGroupsChange,
  buildColumns,
  applyItemColumns,
  applyGroupOrder,
  saveBoardAction,
  reorderGroupsAction,
  getGroupsFromReorderState,
  onCardActivate,
}: UseOptimisticKanbanBoardOptions<
  TItem,
  TGroup,
  TBoardState,
  TReorderState
>): UseOptimisticKanbanBoardResult<TItem, TGroup> {
  const [columns, setColumns] = useState<BoardColumns>(() =>
    buildColumns(items, groups)
  );
  const [columnOrder, setColumnOrder] = useState(() => sortedGroupIds(groups));
  const [prevItems, setPrevItems] = useState(items);
  const [prevGroups, setPrevGroups] = useState(groups);

  const [optimisticColumns, applyOptimisticColumns] = useOptimistic(
    columns,
    (_current: BoardColumns, next: BoardColumns) => next
  );
  const [optimisticColumnOrder, applyOptimisticColumnOrder] = useOptimistic(
    columnOrder,
    (_current: string[], next: string[]) => next
  );

  const columnsRef = useRef(columns);
  const columnOrderRef = useRef(columnOrder);
  const itemsRef = useRef(items);
  const groupsRef = useRef(groups);
  const boardRollbackRef = useRef<{
    columns: BoardColumns;
    items: TItem[];
  } | null>(null);
  const groupsRollbackRef = useRef<{
    order: string[];
    groups: TGroup[];
  } | null>(null);
  const boardSaveInFlightRef = useRef(false);
  const groupsSaveInFlightRef = useRef(false);
  const queuedColumnsRef = useRef<BoardColumns | null>(null);
  const queuedGroupOrderRef = useRef<string[] | null>(null);

  const itemsById = useMemo(() => {
    const map = new Map<string, TItem>();
    for (const item of items) {
      map.set(item.id, item);
    }
    return map;
  }, [items]);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  useEffect(() => {
    columnOrderRef.current = columnOrder;
  }, [columnOrder]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    groupsRef.current = groups;
  }, [groups]);

  const [isBoardPending, startBoardTransition] = useTransition();
  const [isGroupsPending, startGroupsTransition] = useTransition();
  const [boardState, boardAction, isBoardActionPending] = useFormActionState(
    saveBoardAction,
    {} as TBoardState
  );
  const [groupsState, groupsAction, isGroupsActionPending] = useFormActionState(
    reorderGroupsAction,
    {} as TReorderState
  );

  const isPending =
    isBoardPending ||
    isGroupsPending ||
    isBoardActionPending ||
    isGroupsActionPending;

  useActionStateToast(boardState, isBoardPending || isBoardActionPending);
  useActionStateToast(groupsState, isGroupsPending || isGroupsActionPending);

  const flushQueuedColumns = useCallback(() => {
    const queued = queuedColumnsRef.current;
    if (!queued || !sortingEnabled) {
      queuedColumnsRef.current = null;
      return;
    }
    queuedColumnsRef.current = null;

    const currentItems = itemsRef.current;
    const nextItems = applyItemColumns(currentItems, queued);
    boardRollbackRef.current = {
      columns: columnsRef.current,
      items: currentItems,
    };
    boardSaveInFlightRef.current = true;

    const formData = new FormData();
    formData.set("columns", JSON.stringify(queued));

    startBoardTransition(() => {
      applyOptimisticColumns(queued);
      setColumns(queued);
      columnsRef.current = queued;
      onItemsChange(nextItems);
      boardAction(formData);
    });
  }, [
    sortingEnabled,
    applyItemColumns,
    applyOptimisticColumns,
    boardAction,
    onItemsChange,
    startBoardTransition,
  ]);

  const flushQueuedGroupOrder = useCallback(() => {
    const queued = queuedGroupOrderRef.current;
    if (!queued || !sortingEnabled) {
      queuedGroupOrderRef.current = null;
      return;
    }
    queuedGroupOrderRef.current = null;

    const currentGroups = groupsRef.current;
    const nextGroups = applyGroupOrder(currentGroups, queued);
    groupsRollbackRef.current = {
      order: columnOrderRef.current,
      groups: currentGroups,
    };
    groupsSaveInFlightRef.current = true;

    const formData = new FormData();
    formData.set("ordered_ids", JSON.stringify(queued));

    startGroupsTransition(() => {
      applyOptimisticColumnOrder(queued);
      setColumnOrder(queued);
      columnOrderRef.current = queued;
      onGroupsChange(nextGroups);
      groupsAction(formData);
    });
  }, [
    sortingEnabled,
    applyGroupOrder,
    applyOptimisticColumnOrder,
    groupsAction,
    onGroupsChange,
    startGroupsTransition,
  ]);

  useActionStateSuccess(
    boardState,
    isBoardPending || isBoardActionPending,
    () => {
      boardRollbackRef.current = null;
      boardSaveInFlightRef.current = false;
      flushQueuedColumns();
    }
  );
  useActionStateSuccess(
    boardState,
    isBoardPending || isBoardActionPending,
    () => {
      queuedColumnsRef.current = null;
      boardSaveInFlightRef.current = false;
      const rollback = boardRollbackRef.current;
      boardRollbackRef.current = null;
      if (!rollback) {
        return;
      }
      setColumns(rollback.columns);
      columnsRef.current = rollback.columns;
      onItemsChange(rollback.items);
    },
    (state) => state.success === false
  );

  useActionStateSuccess(
    groupsState,
    isGroupsPending || isGroupsActionPending,
    (state) => {
      groupsRollbackRef.current = null;
      groupsSaveInFlightRef.current = false;
      const nextGroups = getGroupsFromReorderState(state);
      if (nextGroups) {
        onGroupsChange(nextGroups);
        setColumnOrder(sortedGroupIds(nextGroups));
      }
      flushQueuedGroupOrder();
    }
  );
  useActionStateSuccess(
    groupsState,
    isGroupsPending || isGroupsActionPending,
    () => {
      queuedGroupOrderRef.current = null;
      groupsSaveInFlightRef.current = false;
      const rollback = groupsRollbackRef.current;
      groupsRollbackRef.current = null;
      if (!rollback) {
        return;
      }
      setColumnOrder(rollback.order);
      columnOrderRef.current = rollback.order;
      onGroupsChange(rollback.groups);
    },
    (state) => state.success === false
  );

  // Don't rebuild from parent props while a save is in flight — that can
  // clobber optimistic columns before success/rollback settles.
  if (!isPending && (items !== prevItems || groups !== prevGroups)) {
    setPrevItems(items);
    setPrevGroups(groups);
    setColumns(buildColumns(items, groups));
    setColumnOrder(sortedGroupIds(groups));
  }

  const persistColumns = useCallback(
    (nextColumns: BoardColumns) => {
      // Defense in depth: search/filter mode must never persist a partial board.
      if (!sortingEnabled) {
        return;
      }

      const previousColumns = columnsRef.current;
      const currentItems = itemsRef.current;
      const nextItems = applyItemColumns(currentItems, nextColumns);

      applyOptimisticColumns(nextColumns);
      setColumns(nextColumns);
      columnsRef.current = nextColumns;
      onItemsChange(nextItems);

      if (boardSaveInFlightRef.current) {
        queuedColumnsRef.current = nextColumns;
        return;
      }

      boardRollbackRef.current = {
        columns: previousColumns,
        items: currentItems,
      };
      boardSaveInFlightRef.current = true;

      const formData = new FormData();
      formData.set("columns", JSON.stringify(nextColumns));

      startBoardTransition(() => {
        boardAction(formData);
      });
    },
    [
      sortingEnabled,
      applyItemColumns,
      applyOptimisticColumns,
      boardAction,
      onItemsChange,
      startBoardTransition,
    ]
  );

  const persistGroupOrder = useCallback(
    (orderedIds: string[]) => {
      if (!sortingEnabled) {
        return;
      }

      const previousOrder = columnOrderRef.current;
      const currentGroups = groupsRef.current;
      const nextGroups = applyGroupOrder(currentGroups, orderedIds);

      applyOptimisticColumnOrder(orderedIds);
      setColumnOrder(orderedIds);
      columnOrderRef.current = orderedIds;
      onGroupsChange(nextGroups);

      if (groupsSaveInFlightRef.current) {
        queuedGroupOrderRef.current = orderedIds;
        return;
      }

      groupsRollbackRef.current = {
        order: previousOrder,
        groups: currentGroups,
      };
      groupsSaveInFlightRef.current = true;

      const formData = new FormData();
      formData.set("ordered_ids", JSON.stringify(orderedIds));

      startGroupsTransition(() => {
        groupsAction(formData);
      });
    },
    [
      sortingEnabled,
      applyGroupOrder,
      applyOptimisticColumnOrder,
      groupsAction,
      onGroupsChange,
      startGroupsTransition,
    ]
  );

  const {
    mounted,
    cardDrag,
    columnDrag,
    columnIndicatorDisplayIndex,
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
  } = usePointerKanbanBoard({
    columns,
    columnOrder,
    canDragCards,
    canReorderColumns,
    sortingEnabled,
    // Rapid moves are coalesced via the save queue — do not hard-block drag.
    isPending: false,
    onPersistColumns: persistColumns,
    onPersistColumnOrder: persistGroupOrder,
    onCardActivate,
  });

  useEffect(() => {
    refreshOverflow();
  }, [
    optimisticColumns,
    optimisticColumnOrder,
    groups.length,
    items.length,
    refreshOverflow,
  ]);

  const handleColumnCardPointerDown = useCallback(
    (
      event: ReactPointerEvent<HTMLDivElement>,
      item: TItem,
      columnId: string,
      index: number
    ) => {
      handleCardPointerDown(event, item.id, columnId, index);
    },
    [handleCardPointerDown]
  );

  const getColumnItems = useCallback(
    (columnId: string) =>
      (optimisticColumns[columnId] ?? [])
        .map((id) => itemsById.get(id))
        .filter((row): row is TItem => Boolean(row)),
    [optimisticColumns, itemsById]
  );

  const groupsById = useMemo(() => {
    const map = new Map<string, TGroup>();
    for (const group of groups) {
      map.set(group.id, group);
    }
    return map;
  }, [groups]);

  const orderedGroups = optimisticColumnOrder
    .map((id) => groupsById.get(id))
    .filter((group): group is TGroup => Boolean(group));

  return {
    isPending,
    mounted,
    itemsById,
    orderedGroups,
    cardDrag,
    columnDrag,
    columnIndicatorDisplayIndex,
    isBoardDragging,
    boardScrollRef,
    canPan,
    isPanning,
    scrollProps,
    setColumnNode,
    setListNode,
    handleColumnHeaderPointerDown,
    handleColumnCardPointerDown,
    getColumnItems,
  };
}
