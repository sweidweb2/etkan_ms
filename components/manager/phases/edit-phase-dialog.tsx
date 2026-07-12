"use client";

import { useActionState, useEffect, useTransition } from "react";
import { updateSemesterAction } from "@/app/manager/phases/actions";
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
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { useZodForm } from "@/hooks/use-zod-form";
import { MANAGER_SEMESTER_STATUS_LABELS } from "@/lib/constants/manager-phase-display";
import type { SemesterStatusValue } from "@/lib/constants/manager-semester-status";
import {
  updatePhaseSchema,
  type UpdatePhaseInput,
} from "@/lib/validators/manager/update-phase";
import type {
  ManagerSemesterRow,
  UpdateSemesterActionState,
} from "@/types/manager-phase";

const initialState: UpdateSemesterActionState = {};

type EditPhaseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  semester: ManagerSemesterRow;
  onSemesterUpdated: (semester: ManagerSemesterRow) => void;
};

export function EditPhaseDialog({
  open,
  onOpenChange,
  semester,
  onSemesterUpdated,
}: EditPhaseDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateSemesterAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;

  useActionStateToast(state, isPending);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useZodForm({
    schema: updatePhaseSchema,
    mode: "onBlur",
    defaultValues: {
      id: semester.id,
      name: semester.name,
      nb_courses: semester.nb_courses,
      amount: semester.amount,
      status: semester.status,
    },
  });

  const selectedStatus = watch("status");

  useEffect(() => {
    if (open) {
      reset({
        id: semester.id,
        name: semester.name,
        nb_courses: semester.nb_courses,
        amount: semester.amount,
        status: semester.status,
      });
    }
  }, [open, reset, semester]);

  useEffect(() => {
    if (!state.success || !state.semester) {
      return;
    }

    onOpenChange(false);
    onSemesterUpdated(state.semester);
  }, [state.success, state.semester, onOpenChange, onSemesterUpdated]);

  function onSubmit(values: UpdatePhaseInput) {
    const formData = new FormData();
    formData.set("id", values.id);
    formData.set("name", values.name.trim());
    formData.set("nb_courses", String(values.nb_courses));
    formData.set("amount", String(values.amount));
    formData.set("status", values.status);

    startTransition(() => {
      formAction(formData);
    });
  }

  const nameError = errors.name?.message ?? state.fieldErrors?.name?.[0];
  const coursesError =
    errors.nb_courses?.message ?? state.fieldErrors?.nb_courses?.[0];
  const amountError = errors.amount?.message ?? state.fieldErrors?.amount?.[0];
  const statusError = errors.status?.message ?? state.fieldErrors?.status?.[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit semester</DialogTitle>
          <DialogDescription>
            Update name, courses, amount, and lifecycle status.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-semester-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <input type="hidden" {...register("id")} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <FieldLabel
                htmlFor="edit-semester-name"
                label="Name"
                hint="Required"
              />
              <Input
                id="edit-semester-name"
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
                htmlFor="edit-semester-courses"
                label="Number of courses"
                hint="Required"
              />
              <Input
                id="edit-semester-courses"
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
                htmlFor="edit-semester-amount"
                label="Amount"
                hint="Required"
              />
              <Input
                id="edit-semester-amount"
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

            <div className="flex flex-col gap-2 sm:col-span-2">
              <FieldLabel
                htmlFor="edit-semester-status"
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
                  id="edit-semester-status"
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
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" form="edit-semester-form" disabled={isPending}>
            {isPending ? (
              <>
                <InlineSpinner className="mr-2" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
