"use client";

import type { ReactNode } from "react";
import {
  GripVerticalIcon,
  LayersIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { Can } from "@/components/auth/can";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { KanbanBoardScroll } from "@/components/manager/kanban/kanban-board-scroll";
import { KanbanColumnDropIndicator } from "@/components/manager/kanban/kanban-drop-indicators";
import { KanbanDragOverlay } from "@/components/manager/kanban/kanban-drag-overlay";
import { PointerKanbanColumn } from "@/components/manager/kanban/pointer-kanban-column";
import { EmptyState } from "@/components/ui/empty-state";
import type {
  OptimisticKanbanGroupBase,
  OptimisticKanbanItemBase,
  UseOptimisticKanbanBoardResult,
} from "@/hooks/use-optimistic-kanban-board";
import type { PermissionKey } from "@/lib/constants/permissions";
import { COLUMN_OVERLAY_PREVIEW_CARDS } from "@/lib/kanban/pointer-drag-types";
import { cn } from "@/lib/utils";

type BoardGroup = OptimisticKanbanGroupBase & {
  name: string;
};

type PointerKanbanBoardViewProps<
  TItem extends OptimisticKanbanItemBase,
  TGroup extends BoardGroup,
> = {
  /** True when there are no items and no groups at all. */
  isEmpty: boolean;
  emptyTitle: string;
  emptyDescription: string;
  /** True when a search/filter hid every card but groups still exist. */
  isFilterEmpty?: boolean;
  filterEmptyTitle?: string;
  filterEmptyDescription?: string;
  board: UseOptimisticKanbanBoardResult<TItem, TGroup>;
  canDragCards: boolean;
  canReorderColumns: boolean;
  sortingEnabled: boolean;
  unassignedId: string;
  unassignedDescription: string;
  unassignedEmptyLabel: string;
  groupEmptyLabel: string;
  getGroupDescription: (group: TGroup) => string;
  createPermission: PermissionKey;
  createLabel: string;
  createAriaLabel: string;
  onRequestCreate: () => void;
  renderCard: (
    item: TItem,
    options: { linkToDetail: boolean; className?: string }
  ) => ReactNode;
};

export function PointerKanbanBoardView<
  TItem extends OptimisticKanbanItemBase,
  TGroup extends BoardGroup,
>({
  isEmpty,
  emptyTitle,
  emptyDescription,
  isFilterEmpty = false,
  filterEmptyTitle = "No matching cards",
  filterEmptyDescription = "Clear search to see the full board.",
  board,
  canDragCards,
  canReorderColumns,
  sortingEnabled,
  unassignedId,
  unassignedDescription,
  unassignedEmptyLabel,
  groupEmptyLabel,
  getGroupDescription,
  createPermission,
  createLabel,
  createAriaLabel,
  onRequestCreate,
  renderCard,
}: PointerKanbanBoardViewProps<TItem, TGroup>) {
  const {
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
  } = board;

  if (isEmpty) {
    return (
      <EmptyState
        icon={LayersIcon}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  if (isFilterEmpty) {
    return (
      <EmptyState
        icon={SearchIcon}
        title={filterEmptyTitle}
        description={filterEmptyDescription}
      />
    );
  }

  const cardsDraggable = canDragCards && sortingEnabled && mounted;
  const columnsDraggable = canReorderColumns && sortingEnabled && mounted;
  // Pending saves are queued — keep dragging enabled; only search locks the board.
  const dragDisabled = !sortingEnabled || columnDrag !== null;

  const draggingItem = cardDrag
    ? (itemsById.get(cardDrag.draggingCardId) ?? null)
    : null;

  const draggingGroup = columnDrag
    ? (orderedGroups.find(
        (group) => group.id === columnDrag.draggingColumnId
      ) ?? null)
    : null;
  const draggingGroupItems = columnDrag
    ? getColumnItems(columnDrag.draggingColumnId).slice(
        0,
        COLUMN_OVERLAY_PREVIEW_CARDS
      )
    : [];

  return (
    <>
      {isPending ? (
        <p
          className="mb-2 inline-flex items-center gap-2 text-xs text-muted-foreground"
          aria-live="polite"
        >
          <InlineSpinner className="size-3.5" />
          Saving board…
        </p>
      ) : null}

      <KanbanBoardScroll
        boardScrollRef={boardScrollRef}
        scrollProps={scrollProps}
        canPan={canPan}
        isPanning={isPanning}
        isBoardDragging={isBoardDragging}
      >
        <PointerKanbanColumn
          columnId={unassignedId}
          title="Unassigned"
          description={unassignedDescription}
          emptyLabel={unassignedEmptyLabel}
          items={getColumnItems(unassignedId)}
          canDragCards={cardsDraggable}
          dragDisabled={dragDisabled}
          columnDraggable={false}
          isCardDropTarget={cardDrag?.targetColumnId === unassignedId}
          cardDragState={cardDrag}
          columnRef={(element) => setColumnNode(unassignedId, element)}
          listRef={(element) => setListNode(unassignedId, element)}
          onCardPointerDown={handleColumnCardPointerDown}
          renderCard={renderCard}
        />

        {orderedGroups.map((group, groupIndex) => (
          <div key={group.id} className="contents">
            {columnIndicatorDisplayIndex === groupIndex ? (
              <KanbanColumnDropIndicator />
            ) : null}
            <PointerKanbanColumn
              columnId={group.id}
              title={group.name}
              description={getGroupDescription(group)}
              emptyLabel={groupEmptyLabel}
              items={getColumnItems(group.id)}
              canDragCards={cardsDraggable}
              dragDisabled={dragDisabled}
              columnDraggable={columnsDraggable}
              isCardDropTarget={cardDrag?.targetColumnId === group.id}
              isColumnDragging={columnDrag?.draggingColumnId === group.id}
              cardDragState={cardDrag}
              columnRef={(element) => setColumnNode(group.id, element)}
              listRef={(element) => setListNode(group.id, element)}
              onCardPointerDown={handleColumnCardPointerDown}
              onColumnHeaderPointerDown={handleColumnHeaderPointerDown}
              renderCard={renderCard}
            />
          </div>
        ))}

        {columnIndicatorDisplayIndex !== null &&
        columnIndicatorDisplayIndex >= orderedGroups.length ? (
          <KanbanColumnDropIndicator />
        ) : null}

        <Can permission={createPermission}>
          <button
            type="button"
            onClick={onRequestCreate}
            className={cn(
              "flex w-56 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 px-4 py-10 text-muted-foreground transition-colors",
              "hover:border-primary/50 hover:bg-primary/5 hover:text-primary",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
            aria-label={createAriaLabel}
          >
            <span className="inline-flex size-10 items-center justify-center rounded-full border border-dashed border-current">
              <PlusIcon className="size-5" />
            </span>
            <span className="text-sm font-medium">{createLabel}</span>
          </button>
        </Can>
      </KanbanBoardScroll>

      <KanbanDragOverlay
        mounted={mounted}
        active={Boolean(cardDrag && draggingItem)}
        pointerX={cardDrag?.pointerX ?? 0}
        pointerY={cardDrag?.pointerY ?? 0}
        grabOffsetX={cardDrag?.grabOffsetX ?? 0}
        grabOffsetY={cardDrag?.grabOffsetY ?? 0}
        overlayWidth={cardDrag?.overlayWidth ?? 0}
        className="rotate-[2deg] opacity-95 shadow-2xl"
      >
        {draggingItem
          ? renderCard(draggingItem, {
              linkToDetail: false,
              className: "border-primary/40 bg-card",
            })
          : null}
      </KanbanDragOverlay>

      <KanbanDragOverlay
        mounted={mounted}
        active={Boolean(columnDrag && draggingGroup)}
        pointerX={columnDrag?.pointerX ?? 0}
        pointerY={columnDrag?.pointerY ?? 0}
        grabOffsetX={columnDrag?.grabOffsetX ?? 0}
        grabOffsetY={columnDrag?.grabOffsetY ?? 0}
        overlayWidth={columnDrag?.overlayWidth ?? 0}
        overlayHeight={columnDrag?.overlayHeight}
        className="flex w-72 flex-col overflow-hidden rounded-xl border border-primary/40 bg-card/95 opacity-95 shadow-2xl rotate-[1.5deg]"
      >
        {draggingGroup ? (
          <>
            <div className="border-b px-3 py-3">
              <div className="flex items-start gap-1.5">
                <GripVerticalIcon
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold tracking-tight">
                    {draggingGroup.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {getGroupDescription(draggingGroup)}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 p-3">
              {draggingGroupItems.map((item) => (
                <div key={item.id}>
                  {renderCard(item, {
                    linkToDetail: false,
                    className: "pointer-events-none",
                  })}
                </div>
              ))}
            </div>
          </>
        ) : null}
      </KanbanDragOverlay>
    </>
  );
}
