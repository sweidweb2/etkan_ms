"use client";

import { useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { MessageSquareIcon } from "lucide-react";
import { listGuestStatusEventsAction } from "@/app/manager/guests/actions";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GUEST_CURRENT_STATUS_BADGE_CLASSES,
  GUEST_CURRENT_STATUS_LABELS,
  GUEST_PIPELINE_STATUS_VALUES,
  GUEST_STATUS_LABELS,
  type GuestStatus,
} from "@/lib/constants/guest";
import { cn } from "@/lib/utils";
import type {
  ManagerGuestRow,
  ManagerGuestStatusEventRow,
} from "@/types/manager-guest";

type ViewGuestNotesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guest: ManagerGuestRow | null;
};

function uniquePipelineStatuses(
  events: ManagerGuestStatusEventRow[]
): GuestStatus[] {
  const recorded = new Set(events.map((event) => event.status));
  return GUEST_PIPELINE_STATUS_VALUES.filter((status) => recorded.has(status));
}

export function ViewGuestNotesDialog({
  open,
  onOpenChange,
  guest,
}: ViewGuestNotesDialogProps) {
  const guestId = guest?.id ?? null;
  const [isPending, startTransition] = useTransition();
  const [events, setEvents] = useState<{
    id: string;
    rows: ManagerGuestStatusEventRow[];
  } | null>(null);
  const [loadError, setLoadError] = useState<{
    id: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!open || !guestId) {
      return;
    }

    let cancelled = false;

    startTransition(async () => {
      const result = await listGuestStatusEventsAction(guestId);
      if (cancelled) {
        return;
      }
      if (!result.success) {
        setLoadError({ id: guestId, message: result.error });
        return;
      }
      setLoadError(null);
      setEvents({ id: guestId, rows: result.statusEvents });
    });

    return () => {
      cancelled = true;
    };
  }, [open, guestId]);

  const displayEvents = events?.id === guestId ? events.rows : [];
  const errorMessage = loadError?.id === guestId ? loadError.message : null;
  const pipelineStatuses = uniquePipelineStatuses(displayEvents);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareIcon className="size-4 text-muted-foreground" />
            {guest?.full_name ?? "Guest notes"}
          </DialogTitle>
          <DialogDescription>
            Notes and recorded statuses for this guest.
          </DialogDescription>
        </DialogHeader>

        {guest ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Profile status
              </p>
              <span
                className={cn(
                  "inline-flex w-fit rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                  GUEST_CURRENT_STATUS_BADGE_CLASSES[guest.status]
                )}
              >
                {GUEST_CURRENT_STATUS_LABELS[guest.status]}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Pipeline statuses
              </p>
              {isPending ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <InlineSpinner />
                  Loading statuses…
                </div>
              ) : errorMessage ? (
                <p className="text-sm text-destructive">{errorMessage}</p>
              ) : pipelineStatuses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No pipeline statuses recorded yet.
                </p>
              ) : (
                <ul className="flex flex-wrap gap-1.5">
                  {pipelineStatuses.map((status) => (
                    <li
                      key={status}
                      className="rounded-md bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-300"
                    >
                      {GUEST_STATUS_LABELS[status]}
                    </li>
                  ))}
                </ul>
              )}
              {!isPending && !errorMessage && displayEvents.length > 0 ? (
                <ol className="mt-1 max-h-40 space-y-2 overflow-y-auto border-l border-border pl-3">
                  {displayEvents.map((event) => (
                    <li key={event.id} className="text-sm">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-medium">
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
                        <p className="text-muted-foreground">{event.note}</p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`guest-notes-${guest.id}`}
                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                Notes
              </label>
              <textarea
                id={`guest-notes-${guest.id}`}
                readOnly
                rows={4}
                value={guest.notes?.trim() ? guest.notes : ""}
                placeholder="No notes."
                className={cn(
                  "w-full min-w-0 resize-none rounded-lg border border-input bg-muted/30 px-2.5 py-2 text-sm outline-none",
                  "placeholder:text-muted-foreground"
                )}
              />
            </div>
          </div>
        ) : null}

        <DialogFooter className="sm:justify-end">
          <Button type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
