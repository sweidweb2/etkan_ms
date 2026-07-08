"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type SubjectCollapsibleSectionProps = {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode | ((open: boolean) => ReactNode);
};

export function SubjectCollapsibleSection({
  title,
  description,
  defaultOpen = true,
  children,
}: SubjectCollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <section className="min-w-0 overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex w-full items-center gap-3 bg-muted/50 px-4 py-4 text-left transition-colors duration-200",
          open && "border-b",
          "rounded-t-xl",
          !open && "rounded-b-xl",
          "hover:bg-muted/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
        )}
      >
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-in-out",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      <div
        id={panelId}
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="px-4 py-4">
            {typeof children === "function" ? children(open) : children}
          </div>
        </div>
      </div>
    </section>
  );
}
