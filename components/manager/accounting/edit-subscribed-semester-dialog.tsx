"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FieldLabel } from "@/components/auth/field-label";
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
import { MANAGER_SUBSCRIBED_SEMESTER_STATUS_LABELS } from "@/lib/constants/manager-subscribed-semester-display";
import type { SubscribedSemesterStatusValue } from "@/lib/constants/manager-subscribed-semester-status";
import { showSuccessToast } from "@/lib/toast";
import {
  updateSubscribedSemesterSchema,
  type UpdateSubscribedSemesterInput,
} from "@/lib/validators/manager/update-subscribed-semester";
import type { ManagerSubscribedSemesterRow } from "@/types/manager-student-account";

type EditSubscribedSemesterDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: ManagerSubscribedSemesterRow;
  onUpdateSubscription: (subscription: ManagerSubscribedSemesterRow) => void;
};

export function EditSubscribedSemesterDialog({
  open,
  onOpenChange,
  subscription,
  onUpdateSubscription,
}: EditSubscribedSemesterDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpdateSubscribedSemesterInput>({
    resolver: zodResolver(updateSubscribedSemesterSchema),
    mode: "onBlur",
    defaultValues: {
      amount: subscription.amount,
      status: subscription.status,
    },
  });

  const selectedStatus = watch("status");

  useEffect(() => {
    if (open) {
      reset({
        amount: subscription.amount,
        status: subscription.status,
      });
    }
  }, [open, reset, subscription]);

  function onSubmit(values: UpdateSubscribedSemesterInput) {
    onUpdateSubscription({
      ...subscription,
      amount: values.amount,
      status: values.status,
    });
    showSuccessToast("Subscribed semester updated.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit subscribed semester</DialogTitle>
          <DialogDescription>
            Update billing details for {subscription.semester_name}. Changes are
            preview-only until backend is connected.
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
              aria-invalid={!!errors.amount}
            />
            {errors.amount ? (
              <p className="text-sm text-destructive">{errors.amount.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-subscribed-semester-status"
              label="Status"
              hint="Required"
            />
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
                aria-invalid={!!errors.status}
              >
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent align="start">
                {Object.entries(MANAGER_SUBSCRIBED_SEMESTER_STATUS_LABELS).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            {errors.status ? (
              <p className="text-sm text-destructive">{errors.status.message}</p>
            ) : null}
          </div>
        </form>

        <DialogFooter className="mt-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="edit-subscribed-semester-form">
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
