"use client";

import { format } from "date-fns";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { GUEST_STATUS_LABELS } from "@/lib/constants/guest";
import type { ManagerGuestStatusEventRow } from "@/types/manager-guest";

type GuestStatusHistoryProps = {
  events: ManagerGuestStatusEventRow[];
};

export function GuestStatusHistory({ events }: GuestStatusHistoryProps) {
  return (
    <ClassTabCollapsibleSection
      title="Pipeline history"
      description="Newest first. Profile status changes (Scheduled, Pending, Cancelled, Rejected, Finished) are not listed here."
      storageKey="manager.guests.detail.history"
      defaultOpen
    >
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
    </ClassTabCollapsibleSection>
  );
}
