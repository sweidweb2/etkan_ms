"use client";

import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { GripVerticalIcon } from "lucide-react";
import { KanbanCardDropIndicator } from "@/components/manager/kanban/kanban-drop-indicators";
import type { CardDragState } from "@/lib/kanban/pointer-drag-types";
import { cn } from "@/lib/utils";

export type PointerKanbanColumnItem = {
  id: string;
};

export type PointerKanbanColumnProps<TItem extends PointerKanbanColumnItem> = {
  columnId: string;
  title: string;
  description?: string;
  items: TItem[];
  canDragCards: boolean;
  dragDisabled?: boolean;
  columnDraggable?: boolean;
  isCardDropTarget?: boolean;
  isColumnDragging?: boolean;
  cardDragState: CardDragState | null;
  emptyLabel: string;
  columnRef: (element: HTMLElement | null) => void;
  listRef: (element: HTMLElement | null) => void;
  onCardPointerDown: (
    event: ReactPointerEvent<HTMLDivElement>,
    item: TItem,
    columnId: string,
    index: number
  ) => void;
  onColumnHeaderPointerDown?: (
    event: ReactPointerEvent<HTMLElement>,
    columnId: string
  ) => void;
  renderCard: (
    item: TItem,
    options: { linkToDetail: boolean; className?: string }
  ) => ReactNode;
};

export function PointerKanbanColumn<TItem extends PointerKanbanColumnItem>({
  columnId,
  title,
  description,
  items,
  canDragCards,
  dragDisabled = false,
  columnDraggable = false,
  isCardDropTarget = false,
  isColumnDragging = false,
  cardDragState,
  emptyLabel,
  columnRef,
  listRef,
  onCardPointerDown,
  onColumnHeaderPointerDown,
  renderCard,
}: PointerKanbanColumnProps<TItem>) {
  const showCardIndicator = cardDragState?.targetColumnId === columnId;
  const insertIndex = cardDragState?.insertIndex ?? 0;
  const draggingId = cardDragState?.draggingCardId ?? null;

  const cards: ReactNode[] = [];
  items.forEach((item, index) => {
    if (showCardIndicator && insertIndex === index) {
      cards.push(
        <KanbanCardDropIndicator key={`indicator-${columnId}-${index}`} />
      );
    }

    const isDraggingCard = draggingId === item.id;
    cards.push(
      <div
        key={item.id}
        data-kanban-no-pan=""
        data-kanban-card=""
        data-card-id={item.id}
        className={cn(
          "touch-none transition-[transform,opacity,margin] duration-150 ease-out",
          canDragCards && !dragDisabled ? "cursor-grab" : "cursor-default",
          isDraggingCard && "opacity-35"
        )}
        onPointerDown={(event) => {
          if (!canDragCards || dragDisabled) {
            return;
          }
          onCardPointerDown(event, item, columnId, index);
        }}
      >
        {renderCard(item, {
          linkToDetail: !canDragCards || dragDisabled,
          className:
            canDragCards && !dragDisabled
              ? "hover:border-primary/40"
              : undefined,
        })}
      </div>
    );
  });

  if (
    showCardIndicator &&
    (items.length === 0 || insertIndex >= items.length)
  ) {
    cards.push(
      <KanbanCardDropIndicator key={`indicator-${columnId}-end`} />
    );
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
            {items.length}
          </span>
        </div>
      </header>
      <div
        ref={listRef}
        data-kanban-column-list={columnId}
        className="flex max-h-[min(70vh,42rem)] flex-col gap-3 overflow-y-auto p-3"
      >
        {items.length === 0 && !showCardIndicator ? (
          <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
            {emptyLabel}
          </p>
        ) : (
          cards
        )}
      </div>
    </section>
  );
}
