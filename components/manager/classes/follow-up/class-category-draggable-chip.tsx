"use client";

import { Feedback } from "@dnd-kit/dom";
import { useDraggable } from "@dnd-kit/react";
import { GripVerticalIcon, LockIcon } from "lucide-react";
import { CLASS_CATEGORY_STATUS_LABELS } from "@/lib/constants/class-category-status";
import type { FollowUpContainer } from "@/lib/classes/follow-up-state";
import type { ParentGroupTone } from "@/lib/classes/parent-group-colors";
import { cn } from "@/lib/utils";

const CLONE_FEEDBACK = [Feedback.configure({ feedback: "clone" })];

export const FOLLOW_UP_DRAG_TYPE = "class-category";

type ClassCategoryDraggableChipProps = {
  id: string;
  label: string;
  tone?: ParentGroupTone;
  /** When true, chip is visible but not draggable (assigned while browsing pool). */
  locked?: boolean;
  lockedIn?: Exclude<FollowUpContainer, "pool">;
  /** SSR / pre-hydrate: same look, no DnD hooks. */
  staticOnly?: boolean;
  disabled?: boolean;
};

export function ClassCategoryDraggableChip({
  id,
  label,
  tone,
  locked = false,
  lockedIn,
  staticOnly = false,
  disabled = false,
}: ClassCategoryDraggableChipProps) {
  if (staticOnly || locked) {
    return (
      <StaticChip
        label={label}
        tone={tone}
        locked={locked}
        lockedIn={lockedIn}
      />
    );
  }

  return (
    <DraggableChip
      id={id}
      label={label}
      tone={tone}
      disabled={disabled}
    />
  );
}

function StaticChip({
  label,
  tone,
  locked,
  lockedIn,
}: {
  label: string;
  tone?: ParentGroupTone;
  locked?: boolean;
  lockedIn?: Exclude<FollowUpContainer, "pool">;
}) {
  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium",
        tone?.chip ?? "border-border bg-muted/50 text-foreground",
        locked && "opacity-80"
      )}
    >
      {locked ? <LockIcon className="size-3.5 shrink-0 text-muted-foreground" /> : null}
      <span className="truncate">{label}</span>
      {locked && lockedIn ? (
        <span className="shrink-0 text-[10px] font-normal text-muted-foreground">
          {CLASS_CATEGORY_STATUS_LABELS[lockedIn]}
        </span>
      ) : null}
    </div>
  );
}

function DraggableChip({
  id,
  label,
  tone,
  disabled,
}: {
  id: string;
  label: string;
  tone?: ParentGroupTone;
  disabled?: boolean;
}) {
  const { ref, handleRef, isDragging } = useDraggable({
    id,
    type: FOLLOW_UP_DRAG_TYPE,
    disabled: Boolean(disabled),
    plugins: CLONE_FEEDBACK,
  });

  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-1 text-xs font-medium",
        tone?.chip ?? "border-border bg-muted/50 text-foreground",
        isDragging && "opacity-40"
      )}
    >
      <button
        type="button"
        ref={handleRef}
        disabled={disabled}
        className={cn(
          "inline-flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground",
          disabled
            ? "cursor-not-allowed opacity-50"
            : "cursor-grab hover:bg-black/5 active:cursor-grabbing dark:hover:bg-white/10"
        )}
        aria-label={`Move ${label}`}
      >
        <GripVerticalIcon className="size-3.5" />
      </button>
      <span className="truncate pe-1">{label}</span>
    </div>
  );
}
