"use client";

import { useActionState, useEffect, useTransition } from "react";
import { updateSubscribedSemesterAction } from "@/app/manager/accounting/actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { useZodForm } from "@/hooks/use-zod-form";
import { MANAGER_SUBSCRIBED_SEMESTER_STATUS_LABELS } from "@/lib/constants/manager-subscribed-semester-display";
import {
  SUBSCRIBED_SEMESTER_STATUSES,
  type SubscribedSemesterStatusValue,
} from "@/lib/constants/manager-subscribed-semester-status";
import {
  updateSubscribedSemesterSchema,
  type UpdateSubscribedSemesterInput,
} from "@/lib/validators/manager/update-subscribed-semester";
import type { AccountingMutationActionState } from "@/types/manager-accounting";
import type { ManagerSubscribedSemesterRow } from "@/types/manager-student-account";

const initialState: AccountingMutationActionState = {};

const MANUAL_STATUS_OPTIONS = (
  Object.entries(MANAGER_SUBSCRIBED_SEMESTER_STATUS_LABELS) as Array<
    [SubscribedSemesterStatusValue, string]
  >
).filter(([value]) => value !== SUBSCRIBED_SEMESTER_STATUSES.PAID);

type EditSubscribedSemesterDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: ManagerSubscribedSemesterRow;
  onSubscriptionSaved: () => void;
};

export function EditSubscribedSemesterDialog({
  open,
  onOpenChange,
  subscription,
  onSubscriptionSaved,
}: EditSubscribedSemesterDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateSubscribedSemesterAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;
  const isPaidLocked = subscription.status === SUBSCRIBED_SEMESTER_STATUSES.PAID;

  useActionStateToast(state, isPending);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useZodForm({
    schema: updateSubscribedSemesterSchema,
    mode: "onBlur",
    defaultValues: {
      id: subscription.id,
      amount: subscription.amount,
      status: subscription.status,
    },
  });

  const selectedStatus = watch("status");

  useEffect(() => {
    if (open) {
      reset({
        id: subscription.id,
        amount: subscription.amount,
        status: subscription.status,
      });
    }
  }, [open, reset, subscription]);

  useActionStateSuccess(state, isPending, () => {
    onOpenChange(false);
    onSubscriptionSaved();
  });

  function onSubmit(values: UpdateSubscribedSemesterInput) {
    const formData = new FormData();
    formData.set("id", values.id);
    formData.set("amount", String(values.amount));
    formData.set(
      "status",
      isPaidLocked ? SUBSCRIBED_SEMESTER_STATUSES.PAID : values.status
    );

    startTransition(() => {
      formAction(formData);
    });
  }

  const amountError = errors.amount?.message ?? state.fieldErrors?.amount?.[0];
  const statusError = errors.status?.message ?? state.fieldErrors?.status?.[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit subscribed semester</DialogTitle>
          <DialogDescription>
            Update billing details for {subscription.semester_name}.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-subscribed-semester-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-subscribed-semester-amount"
              label="Amount"
              hint="Required"
            />
            <Input
              id="edit-subscribed-semester-amount"
              type="number"
              min="0"
              step="0.01"
              {...register("amount")}
              aria-invalid={!!amountError}
            />
            {amountError ? (
              <p className="text-sm text-destructive">{amountError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-subscribed-semester-status"
              label="Status"
              hint="Required"
            />
            {isPaidLocked ? (
              <>
                <Input
                  id="edit-subscribed-semester-status"
                  value={MANAGER_SUBSCRIBED_SEMESTER_STATUS_LABELS.paid}
                  disabled
                  readOnly
                />
                <p className="text-sm text-muted-foreground">
                  Paid status is set automatically from payments and cannot be
                  changed here.
                </p>
              </>
            ) : (
              <Select
                value={selectedStatus || null}
                onValueChange={(value) => {
                  if (!value) {
                    return;
                  }

                  setValue("status", value as SubscribedSemesterStatusValue, {
                    shouldValidate: true,
                  });
                }}
              >
                <SelectTrigger
                  id="edit-subscribed-semester-status"
                  className="w-full"
                  aria-invalid={!!statusError}
                >
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent align="start">
                  {MANUAL_STATUS_OPTIONS.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {statusError ? (
              <p className="text-sm text-destructive">{statusError}</p>
            ) : null}
          </div>
        </form>

        <DialogFooter className="mt-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="edit-subscribed-semester-form" disabled={isPending}>
            {isPending ? <InlineSpinner /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
