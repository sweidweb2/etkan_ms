"use client";

import { useEffect, useTransition } from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import { CheckIcon } from "lucide-react";
import { z } from "zod";
import { updateClassStatusAction } from "@/app/manager/classes/actions";
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
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useZodForm } from "@/hooks/use-zod-form";
import {
  MANAGER_CLASS_STATUS_DOT_CLASSES,
  MANAGER_CLASS_STATUS_LABELS,
  MANAGER_CLASS_STATUS_SECONDARY_BUTTON_CLASSES,
} from "@/lib/constants/manager-class-display";
import {
  CLASS_STATUS_VALUES,
  type ClassStatusValue,
} from "@/lib/constants/manager-class-status";
import { cn } from "@/lib/utils";
import type { UpdateClassStatusActionState } from "@/types/manager-class-detail";
import type { ManagerClassRow } from "@/types/manager-class-list";

const changeClassStatusSchema = z.object({
  status: z.enum(CLASS_STATUS_VALUES, {
    message: "Status is required.",
  }),
});

type ChangeClassStatusInput = z.infer<typeof changeClassStatusSchema>;

const initialState: UpdateClassStatusActionState = {};

const STATUS_HINTS: Record<ClassStatusValue, string> = {
  scheduled: "Queued to begin",
  in_progress: "Actively running",
  done: "Completed",
  paused: "Temporarily held",
  stopped: "Ended early",
};

/** Minimal class fields for status changes (teacher + manager). */
export type ChangeClassStatusClassRow = Pick<
  ManagerClassRow,
  "id" | "name" | "status"
>;

type ChangeClassStatusDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classRow: ChangeClassStatusClassRow | null;
  /** Action returns a full manager row; teachers merge status into a slim DTO. */
  onClassUpdated: (classRow: ManagerClassRow) => void;
};

export function ChangeClassStatusDialog({
  open,
  onOpenChange,
  classRow,
  onClassUpdated,
}: ChangeClassStatusDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateClassStatusAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;

  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  useActionStateToast(state, isPending);

  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useZodForm({
    schema: changeClassStatusSchema,
    defaultValues: {
      status: "scheduled",
    },
  });

  const selectedStatus = watch("status") as ClassStatusValue;
  const currentStatus = classRow?.status;

  useEffect(() => {
    if (!open || !classRow) {
      return;
    }

    reset({
      status: classRow.status,
    });
  }, [classRow, open, reset]);

  useActionStateSuccess(
    state,
    isPending,
    (nextState) => {
      if (!nextState.classRow) {
        return;
      }

      onClassUpdated(nextState.classRow);
      onOpenChange(false);
    },
    (nextState) => Boolean(nextState.success && nextState.classRow)
  );

  function onSubmit(values: ChangeClassStatusInput) {
    if (!classRow) {
      return;
    }

    const formData = new FormData();
    formData.set("class_id", classRow.id);
    formData.set("status", values.status);

    startTransition(() => {
      formAction(formData);
    });
  }

  const statusError = errors.status?.message ?? state.fieldErrors?.status?.[0];
  const hasChanges = Boolean(
    currentStatus && selectedStatus && selectedStatus !== currentStatus
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Change class status</DialogTitle>
          <DialogDescription>
            Pick a status for {classRow?.name ?? "this class"}, then save.
          </DialogDescription>
        </DialogHeader>

        <form
          id="change-class-status-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div
            role="radiogroup"
            aria-label="Class status"
            className="grid gap-2.5 sm:grid-cols-2"
          >
            {CLASS_STATUS_VALUES.map((status) => {
              const isSelected = selectedStatus === status;
              const isCurrent = currentStatus === status;

              return (
                <button
                  key={status}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={isPending}
                  onClick={() =>
                    setValue("status", status, { shouldValidate: true })
                  }
                  className={cn(
                    "relative flex min-h-[4.75rem] flex-col items-start gap-1.5 rounded-xl border px-3.5 py-3 text-left transition-all",
                    "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    "disabled:pointer-events-none disabled:opacity-60",
                    MANAGER_CLASS_STATUS_SECONDARY_BUTTON_CLASSES[status],
                    isSelected
                      ? "ring-2 ring-offset-2 ring-offset-background shadow-sm"
                      : "opacity-90 hover:opacity-100",
                    isSelected &&
                      status === "scheduled" &&
                      "ring-violet-500/50",
                    isSelected &&
                      status === "in_progress" &&
                      "ring-sky-500/50",
                    isSelected && status === "done" && "ring-emerald-500/50",
                    isSelected && status === "paused" && "ring-amber-500/50",
                    isSelected && status === "stopped" && "ring-rose-500/50"
                  )}
                >
                  <span className="flex w-full items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className={cn(
                          "size-2.5 shrink-0 rounded-full",
                          MANAGER_CLASS_STATUS_DOT_CLASSES[status]
                        )}
                        aria-hidden
                      />
                      <span className="text-sm font-semibold">
                        {MANAGER_CLASS_STATUS_LABELS[status]}
                      </span>
                    </span>
                    {isSelected ? (
                      <span className="inline-flex size-5 items-center justify-center rounded-full bg-background/80 text-foreground">
                        <CheckIcon className="size-3" aria-hidden />
                      </span>
                    ) : null}
                  </span>
                  <span className="text-xs opacity-80">{STATUS_HINTS[status]}</span>
                  {isCurrent ? (
                    <span className="mt-0.5 text-[10px] font-medium tracking-wide uppercase opacity-70">
                      Current
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          {statusError ? (
            <p className="text-sm text-destructive">{statusError}</p>
          ) : null}
        </form>

        <DialogFooter className="mt-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="change-class-status-form"
            disabled={!classRow || isPending || !hasChanges}
          >
            {isPending ? (
              <>
                <InlineSpinner className="mr-2" />
                Saving
              </>
            ) : (
              "Save status"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
