"use client";

import { useEffect, useState, useTransition } from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import {
  createPaymentPhaseAction,
  loadPaymentPhaseSemesterOptionsAction,
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
  createPaymentPhaseSchema,
  type CreatePaymentPhaseInput,
} from "@/lib/validators/manager/create-payment-phase";
import type {
  CreatePaymentPhaseActionState,
  ManagerPaymentPhaseRow,
  ManagerPaymentPhaseSemesterOption,
} from "@/types/manager-payment-phase";

const initialState: CreatePaymentPhaseActionState = {};

const defaultValues: CreatePaymentPhaseInput = {
  name: "",
  semester_id: "",
  amount: 0,
  upfront_amount: 0,
  duration_months: 1,
  start_date: "",
  end_date: "",
};

type CreatePaymentPhaseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (phase: ManagerPaymentPhaseRow) => void;
};

export function CreatePaymentPhaseDialog({
  open,
  onOpenChange,
  onCreated,
}: CreatePaymentPhaseDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    createPaymentPhaseAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;

  const [fetchedSemesters, setFetchedSemesters] = useState<
    ManagerPaymentPhaseSemesterOption[] | null
  >(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const semesterOptions = fetchedSemesters ?? [];
  const isLoadingOptions = open && fetchedSemesters === null && !optionsError;

  const handleOpenChange = usePendingAwareOpenChange(isPending, (nextOpen) => {
    if (!nextOpen) {
      setFetchedSemesters(null);
      setOptionsError(null);
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
    schema: createPaymentPhaseSchema,
    mode: "onBlur",
    defaultValues,
  });

  const selectedSemesterId = watch("semester_id");
  const hasSemesterOptions = semesterOptions.length > 0;
  const semesterSelectItems = semesterOptions.map((option) => ({
    value: option.id,
    label: option.label,
  }));

  useEffect(() => {
    if (!open) {
      reset(defaultValues);
      return;
    }

    let cancelled = false;
    void loadPaymentPhaseSemesterOptionsAction()
      .then((options) => {
        if (!cancelled) {
          setOptionsError(null);
          setFetchedSemesters(options);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOptionsError("Unable to load semesters.");
          setFetchedSemesters([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, reset]);

  useActionStateSuccess(state, isPending, (nextState) => {
    onOpenChange(false);
    if (nextState.phase) {
      onCreated(nextState.phase);
    }
  });

  function onSubmit(values: CreatePaymentPhaseInput) {
    const formData = new FormData();
    formData.set("name", values.name.trim());
    formData.set("semester_id", values.semester_id);
    formData.set("amount", String(values.amount));
    formData.set("upfront_amount", String(values.upfront_amount));
    formData.set("duration_months", String(values.duration_months));
    formData.set("start_date", values.start_date);
    formData.set("end_date", values.end_date);

    startTransition(() => {
      formAction(formData);
    });
  }

  const nameError = errors.name?.message ?? state.fieldErrors?.name?.[0];
  const semesterError =
    errors.semester_id?.message ?? state.fieldErrors?.semester_id?.[0];
  const amountError = errors.amount?.message ?? state.fieldErrors?.amount?.[0];
  const upfrontError =
    errors.upfront_amount?.message ?? state.fieldErrors?.upfront_amount?.[0];
  const durationError =
    errors.duration_months?.message ?? state.fieldErrors?.duration_months?.[0];
  const startDateError =
    errors.start_date?.message ?? state.fieldErrors?.start_date?.[0];
  const endDateError =
    errors.end_date?.message ?? state.fieldErrors?.end_date?.[0];

  const formDisabled = isPending || isLoadingOptions;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Create payment phase</DialogTitle>
          <DialogDescription>
            Open a payment phase for a semester. Students on the semester&apos;s
            in-progress class are assigned automatically.
          </DialogDescription>
        </DialogHeader>

        <form
          id="create-payment-phase-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="create-payment-phase-name"
              label="Name"
              hint="Required"
            />
            <Input
              id="create-payment-phase-name"
              aria-invalid={!!nameError}
              disabled={formDisabled}
              {...register("name")}
            />
            {nameError ? (
              <p className="text-sm text-destructive">{nameError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="create-payment-phase-semester"
              label="Semester"
              hint="Required"
            />
            {isLoadingOptions ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <InlineSpinner />
                Loading semesters…
              </div>
            ) : (
              <Select
                value={selectedSemesterId ?? ""}
                onValueChange={(value) =>
                  setValue("semester_id", value ?? "", {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                disabled={formDisabled || !hasSemesterOptions}
                items={semesterSelectItems}
              >
                <SelectTrigger
                  id="create-payment-phase-semester"
                  aria-invalid={!!semesterError}
                  className="w-full"
                >
                  <SelectValue
                    placeholder={
                      hasSemesterOptions
                        ? "Select a semester"
                        : "No eligible semesters"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {semesterOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {optionsError ? (
              <p className="text-sm text-destructive">{optionsError}</p>
            ) : null}
            {semesterError ? (
              <p className="text-sm text-destructive">{semesterError}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="create-payment-phase-amount"
                label="Amount"
                hint="Required"
              />
              <Input
                id="create-payment-phase-amount"
                type="number"
                step="0.01"
                min="0"
                aria-invalid={!!amountError}
                disabled={formDisabled}
                {...register("amount", { valueAsNumber: true })}
              />
              {amountError ? (
                <p className="text-sm text-destructive">{amountError}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="create-payment-phase-upfront"
                label="Upfront amount"
                hint="Required"
              />
              <Input
                id="create-payment-phase-upfront"
                type="number"
                step="0.01"
                min="0"
                aria-invalid={!!upfrontError}
                disabled={formDisabled}
                {...register("upfront_amount", { valueAsNumber: true })}
              />
              {upfrontError ? (
                <p className="text-sm text-destructive">{upfrontError}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="create-payment-phase-duration"
              label="Duration (months)"
              hint="Required"
            />
            <Input
              id="create-payment-phase-duration"
              type="number"
              min="1"
              aria-invalid={!!durationError}
              disabled={formDisabled}
              {...register("duration_months", { valueAsNumber: true })}
            />
            {durationError ? (
              <p className="text-sm text-destructive">{durationError}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="create-payment-phase-start"
                label="Start date"
                hint="Required"
              />
              <Input
                id="create-payment-phase-start"
                type="date"
                aria-invalid={!!startDateError}
                disabled={formDisabled}
                {...register("start_date")}
              />
              {startDateError ? (
                <p className="text-sm text-destructive">{startDateError}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="create-payment-phase-end"
                label="End date"
                hint="Required"
              />
              <Input
                id="create-payment-phase-end"
                type="date"
                aria-invalid={!!endDateError}
                disabled={formDisabled}
                {...register("end_date")}
              />
              {endDateError ? (
                <p className="text-sm text-destructive">{endDateError}</p>
              ) : null}
            </div>
          </div>
        </form>

        <DialogFooter>
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
            form="create-payment-phase-form"
            disabled={formDisabled || !hasSemesterOptions}
          >
            {isPending ? <InlineSpinner /> : null}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
