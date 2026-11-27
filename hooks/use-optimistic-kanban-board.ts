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

type GroupBase = {
  id: string;
  sort_order: number;
};

type ItemBase = {
  id: string;
};

export type UseOptimisticKanbanBoardOptions<
  TItem extends ItemBase,
  TGroup extends GroupBase,
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

export type UseOptimisticKanbanBoardResult<
  TItem extends ItemBase,
  TGroup extends GroupBase,
> = {
  isPending: boolean;
  mounted: boolean;
  itemsById: Map<string, TItem>;
  optimisticColumns: BoardColumns;
  optimisticColumnOrder: string[];
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

function sortedGroupIds<TGroup extends GroupBase>(groups: readonly TGroup[]) {
  return [...groups]
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((group) => group.id);
}

export function useOptimisticKanbanBoard<
  TItem extends ItemBase,
  TGroup extends GroupBase,
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
  const boardRollbackRef = useRef<{
    columns: BoardColumns;
    items: TItem[];
  } | null>(null);
  const groupsRollbackRef = useRef<{
    order: string[];
    groups: TGroup[];
  } | null>(null);

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
      onItemsChange(rollback.items);
    },
    (state) => state.success === false
  );

  useActionStateSuccess(
    groupsState,
    isGroupsPending || isGroupsActionPending,
    (state) => {
      groupsRollbackRef.current = null;
      const nextGroups = getGroupsFromReorderState(state);
      if (nextGroups) {
        onGroupsChange(nextGroups);
        setColumnOrder(sortedGroupIds(nextGroups));
      }
    }
  );
  useActionStateSuccess(
    groupsState,
    isGroupsPending || isGroupsActionPending,
    () => {
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
      const nextItems = applyItemColumns(items, nextColumns);
      boardRollbackRef.current = {
        columns: columnsRef.current,
        items,
      };

      const formData = new FormData();
      formData.set("columns", JSON.stringify(nextColumns));

      startBoardTransition(() => {
        applyOptimisticColumns(nextColumns);
        setColumns(nextColumns);
        columnsRef.current = nextColumns;
        onItemsChange(nextItems);
        boardAction(formData);
      });
    },
    [
      items,
      onItemsChange,
      applyItemColumns,
      boardAction,
      startBoardTransition,
      applyOptimisticColumns,
    ]
  );

  const persistGroupOrder = useCallback(
    (orderedIds: string[]) => {
      const nextGroups = applyGroupOrder(groups, orderedIds);
      groupsRollbackRef.current = {
        order: columnOrderRef.current,
        groups,
      };

      const formData = new FormData();
      formData.set("ordered_ids", JSON.stringify(orderedIds));

      startGroupsTransition(() => {
        applyOptimisticColumnOrder(orderedIds);
        setColumnOrder(orderedIds);
        columnOrderRef.current = orderedIds;
        onGroupsChange(nextGroups);
        groupsAction(formData);
      });
    },
    [
      groups,
      onGroupsChange,
      applyGroupOrder,
      groupsAction,
      startGroupsTransition,
      applyOptimisticColumnOrder,
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
    isPending,
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

  const orderedGroups = optimisticColumnOrder
    .map((id) => groups.find((group) => group.id === id))
    .filter((group): group is TGroup => Boolean(group));

  return {
    isPending,
    mounted,
    itemsById,
    optimisticColumns,
    optimisticColumnOrder,
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
