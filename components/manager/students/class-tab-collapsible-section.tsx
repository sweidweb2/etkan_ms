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
  children: ReactNode;
};

export function ClassTabCollapsibleSection({
  title,
  description,
  action,
  storageKey,
  defaultOpen = false,
  children,
}: ClassTabCollapsibleSectionProps) {
  const [open, setOpen] = usePersistedOpen(storageKey, defaultOpen);
  const panelId = useId();

  function toggle() {
    setOpen((current) => !current);
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <div
        className={cn(
          "flex items-center gap-2 bg-muted/40 px-2 py-1.5 transition-colors duration-200 sm:px-3",
          open && "border-b",
          "rounded-t-xl",
          !open && "rounded-b-xl"
        )}
      >
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={toggle}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1.5 text-left",
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
        {action ? (
          <div className="flex shrink-0 items-center gap-2">{action}</div>
        ) : null}
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
          onClick={toggle}
          className={cn(
            "inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground",
            "hover:bg-muted/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
          )}
        >
          <ChevronDownIcon
            className={cn(
              "size-4 transition-transform duration-300 ease-in-out",
              open && "rotate-180"
            )}
            aria-hidden="true"
          />
        </button>
      </div>

      <div
        id={panelId}
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="min-h-0 overflow-hidden">{children}</div>
      </div>
    </section>
  );
}
