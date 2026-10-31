"use client";

import Link from "next/link";
import { PANEL_ICONS } from "@/components/panels/panel-icons";
import { cn } from "@/lib/utils";
import type { PanelNavGroup } from "@/types/panel";

type ManagePagesPanelProps = {
  groups: PanelNavGroup[];
};

export function ManagePagesPanel({ groups }: ManagePagesPanelProps) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pages</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Features parked here for now — open any card to go to that page.
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No additional pages are available for your permissions.
        </p>
      ) : (
        groups.map((group) => (
          <section key={group.id} className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              {group.label}
            </h2>
            <div
              className={cn(
                "grid gap-3 sm:grid-cols-2",
                group.items.length >= 3 ? "lg:grid-cols-3" : null
              )}
            >
              {group.items.map((item) => {
                const Icon = PANEL_ICONS[item.icon];
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    className={cn(
                      "flex min-w-0 items-center gap-3 rounded-xl border bg-card p-4 text-left",
                      "ring-1 ring-border/60 transition-all duration-200",
                      "hover:-translate-y-0.5 hover:bg-accent/40 hover:shadow-sm",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    )}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground">
                        {item.title}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
