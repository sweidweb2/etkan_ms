"use client";

import { useEffect, useTransition } from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import { z } from "zod";
import { updateClassStatusAction } from "@/app/manager/classes/actions";
import { FieldLabel } from "@/components/auth/field-label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useZodForm } from "@/hooks/use-zod-form";
import {
  CLASS_STATUS_VALUES,
} from "@/lib/constants/manager-class-status";
import { MANAGER_CLASS_STATUS_LABELS } from "@/lib/constants/manager-class-display";
import type { UpdateClassStatusActionState } from "@/types/manager-class-detail";
import type { ManagerClassRow } from "@/types/manager-class-list";

const changeClassStatusSchema = z.object({
  status: z.enum(CLASS_STATUS_VALUES, {
    message: "Status is required.",
  }),
});

type ChangeClassStatusInput = z.infer<typeof changeClassStatusSchema>;

const initialState: UpdateClassStatusActionState = {};

type ChangeClassStatusDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classRow: ManagerClassRow | null;
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

  const selectedStatus = watch("status");

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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Change class status</DialogTitle>
          <DialogDescription>
            Update the lifecycle status for {classRow?.name ?? "this class"}.
          </DialogDescription>
        </DialogHeader>

        <form
          id="change-class-status-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="change-class-status"
              label="Status"
              hint="Required"
            />
            <Select
              value={selectedStatus || null}
              onValueChange={(value) => {
                if (!value) {
                  return;
                }

                setValue("status", value as ChangeClassStatusInput["status"], {
                  shouldValidate: true,
                });
              }}
              disabled={isPending}
            >
              <SelectTrigger
                id="change-class-status"
                className="w-full"
                aria-invalid={!!statusError}
              >
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent align="start">
                {CLASS_STATUS_VALUES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {MANAGER_CLASS_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {statusError ? (
              <p className="text-sm text-destructive">{statusError}</p>
            ) : null}
          </div>
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
            disabled={!classRow || isPending}
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
