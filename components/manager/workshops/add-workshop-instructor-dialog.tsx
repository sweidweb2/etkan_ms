"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { addWorkshopInstructorAction } from "@/app/manager/workshops/actions";
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
  WORKSHOP_INSTRUCTOR_ROLES,
  WORKSHOP_WAGE_TYPE_LABELS,
  WORKSHOP_WAGE_TYPE_VALUES,
  WORKSHOP_WAGE_TYPES,
} from "@/lib/constants/manager-workshop-display";
import { cn } from "@/lib/utils";
import {
  createWorkshopInstructorSchema,
  type CreateWorkshopInstructorInput,
} from "@/lib/validators/manager/workshop-instructor";
import type {
  AddWorkshopInstructorActionState,
  ManagerWorkshopInstructorCandidate,
} from "@/types/manager-workshop";

const textareaClassName = cn(
  "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
);

const initialState: AddWorkshopInstructorActionState = {};

type AddWorkshopInstructorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workshopId: string;
  candidates: ManagerWorkshopInstructorCandidate[];
  onAdded: () => void;
};

export function AddWorkshopInstructorDialog({
  open,
  onOpenChange,
  workshopId,
  candidates,
  onAdded,
}: AddWorkshopInstructorDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    addWorkshopInstructorAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;
  const [candidateFilter, setCandidateFilter] = useState("");
  const handleOpenChange = usePendingAwareOpenChange(isPending, (nextOpen) => {
    if (!nextOpen) {
      setCandidateFilter("");
    }
    onOpenChange(nextOpen);
  });

  useActionStateToast(state, isPending);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useZodForm({
    schema: createWorkshopInstructorSchema,
    mode: "onBlur",
    defaultValues: {
      workshop_id: workshopId,
      user_id: "",
      role: WORKSHOP_INSTRUCTOR_ROLES.LEAD,
      wage_type: WORKSHOP_WAGE_TYPES.FIXED,
      wage_amount: null,
      notes: null,
    },
  });

  const userId = watch("user_id");
  const role = watch("role");
  const wageType = watch("wage_type");

  useEffect(() => {
    if (!open) {
      reset({
        workshop_id: workshopId,
        user_id: "",
        role: WORKSHOP_INSTRUCTOR_ROLES.LEAD,
        wage_type: WORKSHOP_WAGE_TYPES.FIXED,
        wage_amount: null,
        notes: null,
      });
    }
  }, [open, reset, workshopId]);

  useActionStateSuccess(state, isPending, () => {
    handleOpenChange(false);
    onAdded();
  });

  const filteredCandidates = useMemo(() => {
    const query = candidateFilter.trim().toLowerCase();
    if (!query) {
      return candidates;
    }
    return candidates.filter((candidate) =>
      candidate.username.toLowerCase().includes(query)
    );
  }, [candidateFilter, candidates]);

  const instructorSelectItems = useMemo(
    () =>
      candidates.map((candidate) => ({
        value: candidate.id,
        label: candidate.username,
      })),
    [candidates]
  );

  const selectedInstructorLabel = useMemo(
    () =>
      candidates.find((candidate) => candidate.id === userId)?.username ?? null,
    [candidates, userId]
  );

  function onSubmit(values: CreateWorkshopInstructorInput) {
    const formData = new FormData();
    formData.set("workshop_id", values.workshop_id);
    formData.set("user_id", values.user_id);
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

  const userError = errors.user_id?.message ?? state.fieldErrors?.user_id?.[0];
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
          <DialogTitle>Add instructor</DialogTitle>
          <DialogDescription>
            Assign an instructor profile to this workshop with a role and wage.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <input type="hidden" {...register("workshop_id")} />

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="instructor-filter"
              label="Instructor"
              hint="Required"
            />
            {candidates.length > 5 ? (
              <Input
                id="instructor-filter"
                value={candidateFilter}
                onChange={(event) => setCandidateFilter(event.target.value)}
                placeholder="Filter by username"
                disabled={isPending}
              />
            ) : null}
            <Select
              value={userId || null}
              items={instructorSelectItems}
              onValueChange={(value) => {
                if (!value) return;
                setValue("user_id", value, { shouldValidate: true });
              }}
              disabled={isPending || candidates.length === 0}
            >
              <SelectTrigger
                aria-invalid={Boolean(userError)}
                className="w-full"
              >
                <SelectValue placeholder="Select instructor">
                  {selectedInstructorLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {filteredCandidates.map((candidate) => (
                  <SelectItem key={candidate.id} value={candidate.id}>
                    {candidate.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {userError ? (
              <p className="text-sm text-destructive">{userError}</p>
            ) : null}
            {candidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All instructor profiles are already assigned, or none exist.
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="instructor-role"
                label="Role"
                hint="Required"
              />
              <Select
                value={role}
                onValueChange={(value) =>
                  setValue("role", value as CreateWorkshopInstructorInput["role"], {
                    shouldValidate: true,
                  })
                }
                disabled={isPending}
              >
                <SelectTrigger
                  id="instructor-role"
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
                htmlFor="instructor-wage-type"
                label="Wage type"
                hint="Required"
              />
              <Select
                value={wageType}
                onValueChange={(value) =>
                  setValue(
                    "wage_type",
                    value as CreateWorkshopInstructorInput["wage_type"],
                    { shouldValidate: true }
                  )
                }
                disabled={isPending}
              >
                <SelectTrigger
                  id="instructor-wage-type"
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
              htmlFor="instructor-wage-amount"
              label="Wage amount"
              hint="Optional"
            />
            <Input
              id="instructor-wage-amount"
              type="number"
              step="any"
              min={0}
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
              htmlFor="instructor-notes"
              label="Notes"
              hint="Optional"
            />
            <textarea
              id="instructor-notes"
              rows={3}
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
            <Button type="submit" disabled={isPending || candidates.length === 0}>
              {isPending ? <InlineSpinner /> : null}
              Add instructor
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
