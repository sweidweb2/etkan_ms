"use client";

import { useEffect, useTransition } from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import { updateWorkshopInstructorAction } from "@/app/manager/workshops/actions";
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
import {
  WORKSHOP_INSTRUCTOR_ROLE_LABELS,
  WORKSHOP_INSTRUCTOR_ROLE_VALUES,
  WORKSHOP_WAGE_TYPE_LABELS,
  WORKSHOP_WAGE_TYPE_VALUES,
  WORKSHOP_WAGE_TYPES,
} from "@/lib/constants/manager-workshop-display";
import { WORKSHOP_FIELD_LIMITS } from "@/lib/constants/workshop-field-limits";
import { cn } from "@/lib/utils";
import {
  updateWorkshopInstructorSchema,
  type UpdateWorkshopInstructorInput,
} from "@/lib/validators/manager/workshop-instructor";
import type {
  ManagerWorkshopInstructorRow,
  UpdateWorkshopInstructorActionState,
} from "@/types/manager-workshop";

const textareaClassName = cn(
  "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
);

const initialState: UpdateWorkshopInstructorActionState = {};

type EditWorkshopInstructorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instructor: ManagerWorkshopInstructorRow | null;
  onUpdated: (instructor: ManagerWorkshopInstructorRow) => void;
};

function toFormDefaults(
  instructor: ManagerWorkshopInstructorRow | null
): UpdateWorkshopInstructorInput {
  return {
    id: instructor?.id ?? "",
    workshop_id: instructor?.workshop_id ?? "",
    role: instructor?.role ?? "lead",
    wage_type: instructor?.wage_type ?? "fixed",
    wage_amount: instructor?.wage_amount ?? null,
    notes: instructor?.notes ?? null,
  };
}

export function EditWorkshopInstructorDialog({
  open,
  onOpenChange,
  instructor,
  onUpdated,
}: EditWorkshopInstructorDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateWorkshopInstructorAction,
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
    schema: updateWorkshopInstructorSchema,
    mode: "onBlur",
    defaultValues: toFormDefaults(instructor),
  });

  const role = watch("role");
  const wageType = watch("wage_type");

  useEffect(() => {
    if (open) {
      reset(toFormDefaults(instructor));
    }
  }, [open, instructor, reset]);

  useActionStateSuccess(state, isPending, (nextState) => {
    if (nextState.instructor) {
      onUpdated(nextState.instructor);
    }
    onOpenChange(false);
  });

  function onSubmit(values: UpdateWorkshopInstructorInput) {
    const formData = new FormData();
    formData.set("id", values.id);
    formData.set("workshop_id", values.workshop_id);
    formData.set("role", values.role);
    formData.set("wage_type", values.wage_type);
    formData.set(
      "wage_amount",
      values.wage_amount == null ? "" : String(values.wage_amount)
    );
    formData.set("notes", values.notes ?? "");

    startTransition(() => {
      formAction(formData);
    });
  }

  const roleError = errors.role?.message ?? state.fieldErrors?.role?.[0];
  const wageTypeError =
    errors.wage_type?.message ?? state.fieldErrors?.wage_type?.[0];
  const wageAmountError =
    errors.wage_amount?.message ?? state.fieldErrors?.wage_amount?.[0];
  const notesError = errors.notes?.message ?? state.fieldErrors?.notes?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        showCloseButton={!isPending}
      >
        <DialogHeader>
          <DialogTitle>Edit instructor</DialogTitle>
          <DialogDescription>
            Update role and wage for{" "}
            {instructor?.full_name?.trim() ? instructor.full_name : "this instructor"}.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <input type="hidden" {...register("id")} />
          <input type="hidden" {...register("workshop_id")} />

          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Instructor
            </p>
            <p className="text-sm text-foreground">
              {instructor?.full_name?.trim() ? instructor.full_name : "—"}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="edit-instructor-role"
                label="Role"
                hint="Required"
              />
              <Select
                value={role}
                onValueChange={(value) =>
                  setValue("role", value as UpdateWorkshopInstructorInput["role"], {
                    shouldValidate: true,
                  })
                }
                disabled={isPending}
              >
                <SelectTrigger
                  id="edit-instructor-role"
                  aria-invalid={Boolean(roleError)}
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORKSHOP_INSTRUCTOR_ROLE_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {WORKSHOP_INSTRUCTOR_ROLE_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {roleError ? (
                <p className="text-sm text-destructive">{roleError}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="edit-instructor-wage-type"
                label="Wage type"
                hint="Required"
              />
              <Select
                value={wageType}
                onValueChange={(value) =>
                  setValue(
                    "wage_type",
                    value as UpdateWorkshopInstructorInput["wage_type"],
                    { shouldValidate: true }
                  )
                }
                disabled={isPending}
              >
                <SelectTrigger
                  id="edit-instructor-wage-type"
                  aria-invalid={Boolean(wageTypeError)}
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORKSHOP_WAGE_TYPE_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {WORKSHOP_WAGE_TYPE_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {wageTypeError ? (
                <p className="text-sm text-destructive">{wageTypeError}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-instructor-wage-amount"
              label="Wage amount"
              hint="Optional"
            />
            <Input
              id="edit-instructor-wage-amount"
              type="number"
              step="any"
              min={WORKSHOP_FIELD_LIMITS.wage_amount.min}
              max={
                wageType === WORKSHOP_WAGE_TYPES.PERCENTAGE
                  ? WORKSHOP_FIELD_LIMITS.wage_percentage.max
                  : WORKSHOP_FIELD_LIMITS.wage_amount.max
              }
              disabled={isPending}
              aria-invalid={Boolean(wageAmountError)}
              {...register("wage_amount")}
            />
            {wageAmountError ? (
              <p className="text-sm text-destructive">{wageAmountError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-instructor-notes"
              label="Notes"
              hint="Optional"
            />
            <textarea
              id="edit-instructor-notes"
              rows={3}
              maxLength={WORKSHOP_FIELD_LIMITS.instructor_notes.max}
              disabled={isPending}
              className={textareaClassName}
              aria-invalid={Boolean(notesError)}
              {...register("notes")}
            />
            {notesError ? (
              <p className="text-sm text-destructive">{notesError}</p>
            ) : null}
          </div>

          {state.error && !state.fieldErrors ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !instructor}>
              {isPending ? <InlineSpinner /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
