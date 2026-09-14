"use client";

import { cn } from "@/lib/utils";
import type { ParentGroupTone } from "@/lib/classes/parent-group-colors";

type CategoryChipProps = {
  label: string;
  selected?: boolean;
  tone?: ParentGroupTone;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
};

export function CategoryChip({
  label,
  selected = false,
  tone,
  disabled = false,
  onClick,
  className,
}: CategoryChipProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex max-w-full items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        selected
          ? (tone?.chipSelected ??
              "border-primary bg-primary/15 text-foreground ring-2 ring-primary/30")
          : (tone?.chip ??
              "border-border bg-muted/40 text-foreground hover:bg-muted"),
        disabled && "cursor-not-allowed opacity-60",
        className
      )}
    >
      <span className="truncate">{label}</span>
    </button>
  );
}
