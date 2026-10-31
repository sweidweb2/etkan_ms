"use client";

import { useId, type ReactNode } from "react";
import { ChevronDownIcon } from "lucide-react";
import { usePersistedOpen } from "@/hooks/use-persisted-open";
import { cn } from "@/lib/utils";

type ClassTabCollapsibleSectionProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  /** When set, open/closed state is restored from localStorage on each visit. */
  storageKey?: string;
  defaultOpen?: boolean;
  /**
   * When false, render a static section header (no expand/collapse controls)
   * and always show children. Used by teacher portal surfaces.
   */
  collapsible?: boolean;
  children: ReactNode;
};

export function ClassTabCollapsibleSection({
  title,
  description,
  action,
  storageKey,
  defaultOpen = false,
  collapsible = true,
  children,
}: ClassTabCollapsibleSectionProps) {
  const [open, setOpen] = usePersistedOpen(
    collapsible ? storageKey : undefined,
    collapsible ? defaultOpen : true
  );
  const panelId = useId();
  const isOpen = collapsible ? open : true;

  function toggle() {
    if (!collapsible) {
      return;
    }
    setOpen((current) => !current);
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-foreground/10">
      <div
        className={cn(
          "flex items-center gap-2 bg-muted/40 px-3 py-2 transition-colors duration-200 sm:px-4",
          isOpen && "border-b border-foreground/10",
          "rounded-t-xl",
          !isOpen && "rounded-b-xl"
        )}
      >
        {collapsible ? (
          <button
            type="button"
            aria-expanded={isOpen}
            aria-controls={panelId}
            onClick={toggle}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1.5 py-1 text-left",
              "hover:bg-muted/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
            )}
          >
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold">{title}</h3>
              {description ? (
                <p className="text-xs text-muted-foreground">{description}</p>
              ) : null}
            </div>
          </button>
        ) : (
          <div className="min-w-0 flex-1 px-1.5 py-1">
            <h3 className="text-sm font-semibold">{title}</h3>
            {description ? (
              <p className="text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
        )}
        {action ? (
          <div className="flex shrink-0 items-center gap-2">{action}</div>
        ) : null}
        {collapsible ? (
          <button
            type="button"
            aria-expanded={isOpen}
            aria-controls={panelId}
            aria-label={isOpen ? `Collapse ${title}` : `Expand ${title}`}
            onClick={toggle}
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground",
              "hover:bg-muted/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
            )}
          >
            <ChevronDownIcon
              className={cn(
                "size-4 transition-transform duration-300 ease-in-out",
                isOpen && "rotate-180"
              )}
              aria-hidden="true"
            />
          </button>
        ) : null}
      </div>

      {collapsible ? (
        <div
          id={panelId}
          className={cn(
            "grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none",
            isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="min-h-0 overflow-hidden">{children}</div>
        </div>
      ) : (
        <div>{children}</div>
      )}
    </section>
  );
}
