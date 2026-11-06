"use client";

import { LayoutGridIcon, ListIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MANAGER_LIST_VIEW_MODES,
  type ManagerListViewMode,
} from "@/lib/constants/manager-list-view-mode";
import { cn } from "@/lib/utils";

const VIEW_MODE_OPTIONS = [
  { value: MANAGER_LIST_VIEW_MODES.TABLE, label: "Table view", icon: ListIcon },
  { value: MANAGER_LIST_VIEW_MODES.GRID, label: "Grid view", icon: LayoutGridIcon },
] as const;

type ListViewModeToggleProps = {
  value: ManagerListViewMode;
  onChange: (mode: ManagerListViewMode) => void;
  /** Accessible name for the button group, e.g. "Payment phases layout". */
  label: string;
  className?: string;
};

/** Icon-only table/grid switch. Must render inside a `TooltipProvider`. */
export function ListViewModeToggle({
  value,
  onChange,
  label,
  className,
}: ListViewModeToggleProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 gap-0.5 rounded-lg border bg-muted/40 p-0.5",
        className
      )}
    >
      {VIEW_MODE_OPTIONS.map((mode) => {
        const Icon = mode.icon;
        const selected = value === mode.value;
        return (
          <Tooltip key={mode.value}>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  size="icon-sm"
                  variant={selected ? "default" : "ghost"}
                  aria-label={mode.label}
                  aria-pressed={selected}
                  className={cn(
                    !selected && "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => onChange(mode.value)}
                />
              }
            >
              <Icon />
            </TooltipTrigger>
            <TooltipContent>{mode.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
