"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type UpfrontWindowChipProps = {
  className?: string;
};

/** Marks a counter that is counting upfront payers instead of fully paid students. */
export function UpfrontWindowChip({ className }: UpfrontWindowChipProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              "inline-flex shrink-0 cursor-default items-center rounded-md bg-teal-500/15 px-2 py-0.5 text-xs font-medium text-teal-700 dark:text-teal-300",
              className
            )}
          />
        }
      >
        Upfront
      </TooltipTrigger>
      <TooltipContent>
        First month of the phase: counts students who paid the upfront.
      </TooltipContent>
    </Tooltip>
  );
}
