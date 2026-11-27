"use client";

import type { HTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";

type KanbanBoardScrollProps = {
  boardScrollRef: Ref<HTMLDivElement>;
  scrollProps: HTMLAttributes<HTMLDivElement>;
  canPan: boolean;
  isPanning: boolean;
  isBoardDragging: boolean;
  children: ReactNode;
};

export function KanbanBoardScroll({
  boardScrollRef,
  scrollProps,
  canPan,
  isPanning,
  isBoardDragging,
  children,
}: KanbanBoardScrollProps) {
  return (
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
      {children}
    </div>
  );
}
