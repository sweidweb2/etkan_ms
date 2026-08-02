"use client";

import { useTransition } from "react";
import { format, parseISO } from "date-fns";
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
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { INSTRUCTOR_SCHEDULE_SLOT_TYPE_LABELS } from "@/lib/validators/manager/instructor-schedule-slot";
import type { CopyInstructorSchedulePreview } from "@/types/manager-instructor-schedule";

type CopyLastWeekInstructorScheduleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: CopyInstructorSchedulePreview | null;
  isLoadingPreview: boolean;
  previewError: string | null;
  onCopy: (preview: CopyInstructorSchedulePreview) => void | Promise<void>;
};

function formatSlotDate(value: string): string {
  try {
    return format(parseISO(value), "EEE, MMM d");
  } catch {
    return value;
  }
}

export function CopyLastWeekInstructorScheduleDialog({
  open,
  onOpenChange,
  preview,
  isLoadingPreview,
  previewError,
  onCopy,
}: CopyLastWeekInstructorScheduleDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const isPending = isTransitionPending;
  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  function handleConfirm() {
    if (!preview || preview.willCreate.length === 0) {
      return;
    }

    onOpenChange(false);
    startTransition(() => {
      void onCopy(preview);
    });
  }

  const createCount = preview?.willCreate.length ?? 0;
  const skipCount = preview?.willSkip.length ?? 0;
  const canConfirm = Boolean(preview) && createCount > 0 && !isLoadingPreview;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Copy last week</DialogTitle>
          <DialogDescription>
            {preview
              ? `Copy this instructor's slots from ${formatSlotDate(preview.lastWeekStart)}–${formatSlotDate(preview.lastWeekEnd)} into ${formatSlotDate(preview.weekStart)}–${formatSlotDate(preview.weekEnd)}. Matching name + date + time will be skipped.`
              : "Review which slots will be created on this week."}
          </DialogDescription>
        </DialogHeader>

        {isLoadingPreview ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <InlineSpinner />
            Loading preview…
          </div>
        ) : previewError ? (
          <p className="py-6 text-sm text-destructive">{previewError}</p>
        ) : preview ? (
          <div className="flex max-h-[24rem] flex-col gap-4 overflow-y-auto">
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">
                Will create ({createCount})
              </h3>
              {createCount === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No new slots to create.
                </p>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {preview.willCreate.map((item) => (
                    <li
                      key={`${item.name}-${item.slotDate}-${item.startTime}`}
                      className="flex flex-col gap-0.5 px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{item.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {INSTRUCTOR_SCHEDULE_SLOT_TYPE_LABELS[item.type]} ·{" "}
                        {formatSlotDate(item.slotDate)} · {item.startTime}–
                        {item.endTime}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">
                Will skip ({skipCount})
              </h3>
              {skipCount === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing to skip.
                </p>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {preview.willSkip.map((item) => (
                    <li
                      key={`skip-${item.name}-${item.slotDate}-${item.startTime}`}
                      className="flex flex-col gap-0.5 px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{item.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {INSTRUCTOR_SCHEDULE_SLOT_TYPE_LABELS[item.type]} ·{" "}
                        {formatSlotDate(item.slotDate)} · {item.startTime}–
                        {item.endTime} — {item.reason}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}

        <DialogFooter className="sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canConfirm || isPending}
            onClick={handleConfirm}
          >
            {isPending ? (
              <>
                <InlineSpinner />
                Copying…
              </>
            ) : createCount > 0 ? (
              `Copy ${createCount} slot${createCount === 1 ? "" : "s"}`
            ) : (
              "Nothing to copy"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
