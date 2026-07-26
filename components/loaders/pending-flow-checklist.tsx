import { CheckIcon } from "lucide-react";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { cn } from "@/lib/utils";

export type PendingFlowStep = {
  id: string;
  label: string;
};

type PendingFlowChecklistProps = {
  steps: readonly PendingFlowStep[];
  activeIndex: number;
  className?: string;
};

export function PendingFlowChecklist({
  steps,
  activeIndex,
  className,
}: PendingFlowChecklistProps) {
  return (
    <ul
      className={cn("flex flex-col gap-2 rounded-lg border bg-muted/40 p-3", className)}
      aria-live="polite"
      aria-busy={activeIndex < steps.length}
    >
      {steps.map((step, index) => {
        const isDone = index < activeIndex;
        const isActive = index === activeIndex;

        return (
          <li
            key={step.id}
            className={cn(
              "flex items-start gap-2 text-sm",
              isDone && "text-foreground",
              isActive && "font-medium text-foreground",
              !isDone && !isActive && "text-muted-foreground"
            )}
          >
            <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
              {isDone ? (
                <CheckIcon className="size-4 text-primary" aria-hidden />
              ) : isActive ? (
                <InlineSpinner />
              ) : (
                <span
                  className="size-2 rounded-full bg-muted-foreground/40"
                  aria-hidden
                />
              )}
            </span>
            <span>{step.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
