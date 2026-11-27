"use client";

import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type KanbanDragOverlayProps = {
  mounted: boolean;
  active: boolean;
  pointerX: number;
  pointerY: number;
  grabOffsetX: number;
  grabOffsetY: number;
  overlayWidth: number;
  overlayHeight?: number;
  className?: string;
  children: ReactNode;
};

export function KanbanDragOverlay({
  mounted,
  active,
  pointerX,
  pointerY,
  grabOffsetX,
  grabOffsetY,
  overlayWidth,
  overlayHeight,
  className,
  children,
}: KanbanDragOverlayProps) {
  if (!mounted || !active) {
    return null;
  }

  const style: CSSProperties = {
    left: pointerX - grabOffsetX,
    top: pointerY - grabOffsetY,
    width: overlayWidth,
  };
  if (overlayHeight != null) {
    style.maxHeight = overlayHeight;
  }

  return createPortal(
    <div
      className={cn("pointer-events-none fixed z-[80]", className)}
      style={style}
    >
      {children}
    </div>,
    document.body
  );
}
