"use client";

import { useId, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ArrowRightIcon, ChevronDownIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AnalyticsSectionProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode | ((open: boolean) => ReactNode);
  drillDownHref?: string;
  drillDownLabel?: string;
  footerNote?: string;
  defaultOpen?: boolean;
};

export function AnalyticsSection({
  title,
  description,
  icon: Icon,
  children,
  drillDownHref,
  drillDownLabel,
  footerNote,
  defaultOpen = false,
}: AnalyticsSectionProps) {
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
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
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
          <div className="flex flex-col gap-4 border-t bg-card px-4 py-4">
            {typeof children === "function" ? children(open) : children}

            {drillDownHref || footerNote ? (
              <div className="flex flex-col items-start gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
                {footerNote ? (
                  <p className="text-xs text-muted-foreground">{footerNote}</p>
                ) : (
                  <span />
                )}
                {drillDownHref && drillDownLabel ? (
                  <Link
                    href={drillDownHref}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "gap-1.5"
                    )}
                  >
                    {drillDownLabel}
                    <ArrowRightIcon className="size-3.5" />
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
