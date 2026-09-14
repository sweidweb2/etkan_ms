"use client";

import type { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/react";
import { CollisionPriority } from "@dnd-kit/abstract";
import { FOLLOW_UP_DRAG_TYPE } from "@/components/manager/classes/follow-up/class-category-draggable-chip";
import type { FollowUpContainer } from "@/lib/classes/follow-up-state";
import { cn } from "@/lib/utils";

type ClassCategoryDropZoneProps = {
  id: FollowUpContainer;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  headerExtra?: ReactNode;
};

export function ClassCategoryDropZone({
  id,
  title,
  description,
  children,
  className,
  headerExtra,
}: ClassCategoryDropZoneProps) {
  const { ref, isDropTarget } = useDroppable({
    id,
    accept: FOLLOW_UP_DRAG_TYPE,
    collisionPriority: CollisionPriority.High,
  });

  return (
    <section
      ref={ref}
      className={cn(
        "rounded-xl border bg-card p-4 transition-colors",
        isDropTarget && "border-primary bg-primary/5",
        className
      )}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {headerExtra}
      </div>
      <div className="flex min-h-16 flex-wrap gap-2">{children}</div>
    </section>
  );
}
