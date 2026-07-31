"use client";

import { useActionState, useEffect, useTransition } from "react";
import { createSemesterAction } from "@/app/manager/semesters/actions";
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
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useZodForm } from "@/hooks/use-zod-form";
import { MANAGER_SEMESTER_STATUS_LABELS } from "@/lib/constants/manager-phase-display";
import {
  SEMESTER_STATUSES,
  type SemesterStatusValue,
} from "@/lib/constants/manager-semester-status";
import {
  createPhaseSchema,
  type CreatePhaseInput,
} from "@/lib/validators/manager/create-phase";
import type { CreateSemesterActionState } from "@/types/manager-phase";

const initialState: CreateSemesterActionState = {};

type AddPhaseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSemesterCreated: () => void;
};

export function AddPhaseDialog({
  open,
  onOpenChange,
  onSemesterCreated,
}: AddPhaseDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    createSemesterAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;

  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  useActionStateToast(state, isPending);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useZodForm({
    schema: createPhaseSchema,
    mode: "onBlur",
    defaultValues: {
      name: "",
      nb_courses: 0,
      amount: 0,
      status: SEMESTER_STATUSES.SCHEDULED,
      start_date: "",
    },
  });

  const selectedStatus = watch("status");

  useEffect(() => {
    if (!open) {
      reset({
        name: "",
        nb_courses: 0,
        amount: 0,
        status: SEMESTER_STATUSES.SCHEDULED,
        start_date: "",
      });
    }
  }, [open, reset]);

  useActionStateSuccess(state, isPending, () => {
    onOpenChange(false);
    onSemesterCreated();
  });

  function onSubmit(values: CreatePhaseInput) {
    const formData = new FormData();
    formData.set("name", values.name.trim());
    formData.set("nb_courses", String(values.nb_courses));
    formData.set("amount", String(values.amount));
    formData.set("status", values.status);
    formData.set("start_date", values.start_date ?? "");

    startTransition(() => {
      formAction(formData);
    });
  }

  const nameError = errors.name?.message ?? state.fieldErrors?.name?.[0];
  const coursesError =
    errors.nb_courses?.message ?? state.fieldErrors?.nb_courses?.[0];
  const amountError = errors.amount?.message ?? state.fieldErrors?.amount?.[0];
  const statusError = errors.status?.message ?? state.fieldErrors?.status?.[0];
  const startDateError =
    errors.start_date?.message ?? state.fieldErrors?.start_date?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Add semester</DialogTitle>
          <DialogDescription>
            Create a semester with name, courses, amount, start date, and
            lifecycle status. A unique 4-digit semester code is assigned
            automatically.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-semester-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <FieldLabel htmlFor="add-semester-name" label="Name" hint="Required" />
              <Input
                id="add-semester-name"
                aria-invalid={!!nameError}
                disabled={isPending}
                {...register("name")}
              />
              {nameError ? (
                <p className="text-sm text-destructive">{nameError}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="add-semester-courses"
                label="Number of courses"
                hint="Required"
              />
              <Input
                id="add-semester-courses"
                type="number"
                min="0"
                aria-invalid={!!coursesError}
                disabled={isPending}
                {...register("nb_courses")}
              />
              {coursesError ? (
                <p className="text-sm text-destructive">{coursesError}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="add-semester-amount"
                label="Amount"
                hint="Required"
              />
              <Input
                id="add-semester-amount"
                type="number"
                min="0"
                step="0.01"
                aria-invalid={!!amountError}
                disabled={isPending}
                {...register("amount")}
              />
              {amountError ? (
                <p className="text-sm text-destructive">{amountError}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="add-semester-start-date"
                label="Start date"
                hint="Optional"
              />
              <Input
                id="add-semester-start-date"
                type="date"
                aria-invalid={!!startDateError}
                disabled={isPending}
                {...register("start_date")}
              />
              {startDateError ? (
                <p className="text-sm text-destructive">{startDateError}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="add-semester-status"
                label="Status"
                hint="Required"
              />
              <Select
                value={selectedStatus}
                onValueChange={(value) => {
                  if (!value) {
                    return;
                  }
                  setValue("status", value as SemesterStatusValue, {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                }}
                disabled={isPending}
              >
                <SelectTrigger
                  id="add-semester-status"
                  aria-invalid={!!statusError}
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MANAGER_SEMESTER_STATUS_LABELS).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
              {statusError ? (
                <p className="text-sm text-destructive">{statusError}</p>
              ) : null}
            </div>
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
          <Button type="submit" form="add-semester-form" disabled={isPending}>
            {isPending ? (
              <>
                <InlineSpinner className="mr-2" />
                Creating…
              </>
            ) : (
              "Create semester"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
