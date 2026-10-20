"use client";

import { useEffect, useTransition } from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import { bulkCreateSppClearancesAction } from "@/app/manager/accounting/actions";
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
  bulkCreateSppClearancesSchema,
  type BulkCreateSppClearancesInput,
} from "@/lib/validators/manager/bulk-create-spp-clearances";
import type { BulkCreateSppClearancesActionState } from "@/types/manager-spp-clearance";

const initialState: BulkCreateSppClearancesActionState = {};

type BulkCreateSppClearancesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentPhaseId: string;
  onCreated: () => void;
};

export function BulkCreateSppClearancesDialog({
  open,
  onOpenChange,
  paymentPhaseId,
  onCreated,
}: BulkCreateSppClearancesDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    bulkCreateSppClearancesAction,
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
    schema: bulkCreateSppClearancesSchema,
    mode: "onBlur",
    defaultValues: {
      payment_phase_id: paymentPhaseId,
      duration_days: SPP_CLEARANCE_DURATION_DAYS_DEFAULT,
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        payment_phase_id: paymentPhaseId,
        duration_days: SPP_CLEARANCE_DURATION_DAYS_DEFAULT,
        notes: "",
      });
    }
  }, [open, reset, paymentPhaseId]);

  useActionStateSuccess(state, isPending, () => {
    onOpenChange(false);
    onCreated();
  });

  function onSubmit(values: BulkCreateSppClearancesInput) {
    const formData = new FormData();
    formData.set("payment_phase_id", paymentPhaseId);
    formData.set("duration_days", String(values.duration_days));
    formData.set("notes", values.notes?.trim() ?? "");

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
          <DialogTitle>Bulk set Month paid</DialogTitle>
          <DialogDescription>
            Marks eligible unpaid students as Month paid for the chosen
            duration. Skips paid, cancelled, and students who already have a
            marker.
          </DialogDescription>
        </DialogHeader>

        <form
          id="bulk-spp-clearance-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="bulk-clearance-duration"
              label="Duration (days)"
              hint="Required"
            />
            <Input
              id="bulk-clearance-duration"
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
            <FieldLabel htmlFor="bulk-clearance-notes" label="Notes" hint="Optional" />
            <textarea
              id="bulk-clearance-notes"
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
            form="bulk-spp-clearance-form"
            disabled={isPending}
          >
            {isPending ? <InlineSpinner /> : null}
            Set Month paid
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
