"use client";

import { useEffect, useTransition } from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import {
  createSppClearanceAction,
  updateSppClearanceAction,
} from "@/app/manager/accounting/actions";
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
import { Input } from "@/components/ui/input";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useZodForm } from "@/hooks/use-zod-form";
import { SPP_CLEARANCE_DURATION_DAYS_DEFAULT } from "@/lib/manager/accounting/spp-clearance";
import { cn } from "@/lib/utils";
import {
  createSppClearanceSchema,
  updateSppClearanceSchema,
  type CreateSppClearanceInput,
  type UpdateSppClearanceInput,
} from "@/lib/validators/manager/upsert-spp-clearance";
import type { ManagerSppClearanceDto } from "@/types/manager-spp-clearance";
import type { UpsertSppClearanceActionState } from "@/types/manager-spp-clearance";

const initialState: UpsertSppClearanceActionState = {};

type UpsertSppClearanceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sppId: string;
  paymentPhaseId: string;
  clearance: ManagerSppClearanceDto | null;
  onSaved: (clearance: ManagerSppClearanceDto) => void;
};

export function UpsertSppClearanceDialog({
  open,
  onOpenChange,
  sppId,
  paymentPhaseId,
  clearance,
  onSaved,
}: UpsertSppClearanceDialogProps) {
  const isEdit = Boolean(clearance);
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    isEdit ? updateSppClearanceAction : createSppClearanceAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;
  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  useActionStateToast(state, isPending);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useZodForm({
    schema: isEdit ? updateSppClearanceSchema : createSppClearanceSchema,
    mode: "onBlur",
    defaultValues: {
      id: clearance?.id,
      student_payment_phase_id: sppId,
      duration_days:
        clearance?.duration_days ?? SPP_CLEARANCE_DURATION_DAYS_DEFAULT,
      notes: clearance?.notes ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        id: clearance?.id,
        student_payment_phase_id: sppId,
        duration_days:
          clearance?.duration_days ?? SPP_CLEARANCE_DURATION_DAYS_DEFAULT,
        notes: clearance?.notes ?? "",
      });
    }
  }, [open, reset, sppId, clearance]);

  useActionStateSuccess(state, isPending, (nextState) => {
    onOpenChange(false);
    if (nextState.clearance) {
      onSaved(nextState.clearance);
    }
  });

  function onSubmit(values: CreateSppClearanceInput | UpdateSppClearanceInput) {
    const formData = new FormData();
    formData.set("student_payment_phase_id", sppId);
    formData.set("payment_phase_id", paymentPhaseId);
    formData.set("duration_days", String(values.duration_days));
    formData.set("notes", values.notes?.trim() ?? "");
    if (isEdit && clearance) {
      formData.set("id", clearance.id);
    }

    startTransition(() => {
      formAction(formData);
    });
  }

  const durationError =
    errors.duration_days?.message ?? state.fieldErrors?.duration_days?.[0];
  const notesError = errors.notes?.message ?? state.fieldErrors?.notes?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Month paid marker" : "Set Month paid marker"}
          </DialogTitle>
          <DialogDescription>
            Theoretical overlay only. Does not change payment balances or SPP
            status. Expires after the chosen number of days.
          </DialogDescription>
        </DialogHeader>

        <form
          id="upsert-spp-clearance-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="spp-clearance-duration"
              label="Duration (days)"
              hint="Required"
            />
            <Input
              id="spp-clearance-duration"
              type="number"
              min={1}
              max={365}
              step={1}
              aria-invalid={!!durationError}
              disabled={isPending}
              {...register("duration_days")}
            />
            {durationError ? (
              <p className="text-sm text-destructive">{durationError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="spp-clearance-notes" label="Notes" hint="Optional" />
            <textarea
              id="spp-clearance-notes"
              rows={3}
              aria-invalid={!!notesError}
              disabled={isPending}
              className={cn(
                "border-input placeholder:text-muted-foreground flex min-h-[72px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
              )}
              {...register("notes")}
            />
            {notesError ? (
              <p className="text-sm text-destructive">{notesError}</p>
            ) : null}
          </div>
        </form>

        <DialogFooter className="sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="upsert-spp-clearance-form"
            disabled={isPending}
          >
            {isPending ? <InlineSpinner /> : null}
            {isEdit ? "Save" : "Set Month paid"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
