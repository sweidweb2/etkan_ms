"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { CalendarIcon, PlusIcon } from "lucide-react";
import { loadWorkshopScheduleSlotsAction } from "@/app/manager/workshops/actions";
import { Can } from "@/components/auth/can";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getManagerWorkshopScheduleCreateRoute } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { INSTRUCTOR_SCHEDULE_SLOT_TYPE_LABELS } from "@/lib/validators/manager/instructor-schedule-slot";
import type { ManagerInstructorScheduleSession } from "@/types/manager-instructor-schedule";

const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

type WorkshopSchedulesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workshopId: string;
  workshopName: string;
};

function formatAnchorDate(value: string): string {
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return value;
  }
}

export function WorkshopSchedulesDialog({
  open,
  onOpenChange,
  workshopId,
  workshopName,
}: WorkshopSchedulesDialogProps) {
  const [loaded, setLoaded] = useState<{
    workshopId: string;
    rows: ManagerInstructorScheduleSession[];
  } | null>(null);
  const slots = loaded?.workshopId === workshopId ? loaded.rows : null;

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    void loadWorkshopScheduleSlotsAction(workshopId).then((rows) => {
      if (!cancelled) {
        setLoaded({ workshopId, rows });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, workshopId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Schedules — {workshopName}</DialogTitle>
          <DialogDescription>
            Weekly schedule slots linked to this workshop.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-auto">
          {slots === null ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <InlineSpinner />
              Loading schedules…
            </div>
          ) : slots.length === 0 ? (
            <EmptyState
              size="sm"
              icon={CalendarIcon}
              title="No schedule slots for this workshop yet"
              description="Create a weekly schedule slot for this workshop."
            />
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Name</th>
                  <th className="pb-2 pr-3 font-medium">Type</th>
                  <th className="pb-2 pr-3 font-medium">Weekday</th>
                  <th className="pb-2 pr-3 font-medium">Time</th>
                  <th className="pb-2 font-medium">Anchor date</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => (
                  <tr
                    key={slot.id}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="py-2.5 pr-3 align-top">
                      <span className="inline-flex items-center gap-2 font-medium text-foreground">
                        <span
                          className="size-3 shrink-0 rounded-full ring-1 ring-foreground/15"
                          style={{ backgroundColor: slot.color }}
                          aria-hidden
                        />
                        {slot.name}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 align-top text-foreground">
                      {INSTRUCTOR_SCHEDULE_SLOT_TYPE_LABELS[slot.type]}
                    </td>
                    <td className="py-2.5 pr-3 align-top text-muted-foreground">
                      {WEEKDAY_LABELS[slot.dayOfWeek] ?? "—"}
                    </td>
                    <td className="py-2.5 pr-3 align-top tabular-nums text-muted-foreground">
                      {slot.startTime}–{slot.endTime}
                    </td>
                    <td className="py-2.5 align-top text-muted-foreground">
                      {formatAnchorDate(slot.slotDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Can permission={PERMISSIONS.INSTRUCTOR_SCHEDULES_CREATE}>
            <Link
              href={getManagerWorkshopScheduleCreateRoute(workshopId)}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              <PlusIcon data-icon="inline-start" />
              Create schedule
            </Link>
          </Can>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
