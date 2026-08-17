"use client";

import { format } from "date-fns";
import { GUEST_STATUS_LABELS } from "@/lib/constants/guest";
import type { ManagerGuestStatusEventRow } from "@/types/manager-guest";

type GuestStatusHistoryProps = {
  events: ManagerGuestStatusEventRow[];
};

export function GuestStatusHistory({ events }: GuestStatusHistoryProps) {
  return (
    <section className="min-w-0 overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <header className="border-b bg-muted/40 px-3 py-2.5 sm:px-4">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          Pipeline history
        </h3>
        <p className="text-xs text-muted-foreground">
          Newest first. This is the pipeline log. Profile status changes
          (Scheduled, Pending, Cancelled, Rejected, Finished) are not listed
          here.
        </p>
      </header>

      <div className="px-3 py-4 sm:px-4">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pipeline events yet.</p>
        ) : (
          <ol className="relative space-y-4 border-l border-border pl-4">
            {events.map((event) => (
              <li key={event.id} className="relative">
                <span className="absolute top-1.5 -left-[1.3125rem] size-2.5 rounded-full border-2 border-background bg-sky-500" />
                <div className="flex flex-col gap-0.5">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-sm font-medium text-foreground">
                      {GUEST_STATUS_LABELS[event.status]}
                    </span>
                    <time
                      dateTime={event.created_at}
                      className="text-xs text-muted-foreground"
                    >
                      {format(new Date(event.created_at), "MMM d, yyyy HH:mm")}
                    </time>
                  </div>
                  {event.note ? (
                    <p className="text-sm text-muted-foreground">{event.note}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
