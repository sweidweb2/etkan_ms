"use client";

import { useEffect, useTransition } from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import type { FieldValues, UseFormRegister, UseFormSetValue } from "react-hook-form";
import { createGuestAction } from "@/app/manager/guests/actions";
import { FieldLabel } from "@/components/auth/field-label";
import { GuestFormFields } from "@/components/manager/guests/guest-form-fields";
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
import { Switch } from "@/components/ui/switch";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useZodForm } from "@/hooks/use-zod-form";
import {
  GUEST_CURRENT_STATUS_LABELS,
  GUEST_CURRENT_STATUSES,
  GUEST_DEFAULT_STATUS,
} from "@/lib/constants/guest";
import {
  createGuestSchema,
  type CreateGuestInput,
} from "@/lib/validators/manager/create-guest";
import type {
  CreateGuestActionState,
  ManagerGuestRow,
} from "@/types/manager-guest";

const initialState: CreateGuestActionState = {};

const emptyDefaults: CreateGuestInput = {
  full_name: "",
  phone: null,
  age: null,
  school_or_university: null,
  education_level: null,
  interested_service: null,
  referred_from: null,
  referred_from_other: null,
  status: GUEST_DEFAULT_STATUS,
  notes: null,
};

type AddGuestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGuestCreated: (guest: ManagerGuestRow) => void;
};

export function AddGuestDialog({
  open,
  onOpenChange,
  onGuestCreated,
}: AddGuestDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    createGuestAction,
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
    schema: createGuestSchema,
    mode: "onBlur",
    defaultValues: emptyDefaults,
  });

  const educationLevel = watch("education_level");
  const interestedService = watch("interested_service");
  const referredFrom = watch("referred_from");
  const status = watch("status");

  useEffect(() => {
    if (!open) {
      reset(emptyDefaults);
    }
  }, [open, reset]);

  useActionStateSuccess(state, isPending, (nextState) => {
    onOpenChange(false);
    if (nextState.guest) {
      onGuestCreated(nextState.guest);
    }
  });

  function onSubmit(values: CreateGuestInput) {
    const formData = new FormData();
    formData.set("full_name", values.full_name.trim());
    formData.set("phone", values.phone ?? "");
    formData.set("age", values.age == null ? "" : String(values.age));
    formData.set("school_or_university", values.school_or_university ?? "");
    formData.set("education_level", values.education_level ?? "");
    formData.set("interested_service", values.interested_service ?? "");
    formData.set("referred_from", values.referred_from ?? "");
    formData.set("referred_from_other", values.referred_from_other ?? "");
    formData.set("status", values.status);
    formData.set("notes", values.notes ?? "");

    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Create guest</DialogTitle>
          <DialogDescription>
            Minimal intake card — only full name is required. Choose Scheduled or
            Pending as the starting profile status. Full registration comes later
            from the guest detail page.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-guest-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1"
          noValidate
        >
          <GuestFormFields
            idPrefix="add-guest"
            register={register as unknown as UseFormRegister<FieldValues>}
            setValue={setValue as unknown as UseFormSetValue<FieldValues>}
            educationLevel={
              typeof educationLevel === "string" ? educationLevel : null
            }
            interestedService={
              typeof interestedService === "string" ? interestedService : null
            }
            referredFrom={
              typeof referredFrom === "string" ? referredFrom : null
            }
            isPending={isPending}
            errors={{
              full_name:
                errors.full_name?.message ?? state.fieldErrors?.full_name?.[0],
              phone: errors.phone?.message ?? state.fieldErrors?.phone?.[0],
              age: errors.age?.message ?? state.fieldErrors?.age?.[0],
              school_or_university:
                errors.school_or_university?.message ??
                state.fieldErrors?.school_or_university?.[0],
              education_level:
                errors.education_level?.message ??
                state.fieldErrors?.education_level?.[0],
              interested_service:
                errors.interested_service?.message ??
                state.fieldErrors?.interested_service?.[0],
              referred_from:
                errors.referred_from?.message ??
                state.fieldErrors?.referred_from?.[0],
              referred_from_other:
                errors.referred_from_other?.message ??
                state.fieldErrors?.referred_from_other?.[0],
              notes: errors.notes?.message ?? state.fieldErrors?.notes?.[0],
            }}
          />

          <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
            <div className="flex min-w-0 flex-col gap-0.5">
              <FieldLabel
                htmlFor="add-guest-status"
                label="Initial status"
                hint="Required"
              />
              <p className="text-xs text-muted-foreground">
                {status === GUEST_CURRENT_STATUSES.PENDING
                  ? "Pending unlocks the pipeline schema immediately."
                  : "Scheduled is the default. Switch to Pending when follow-up has started."}
              </p>
              {state.fieldErrors?.status?.[0] ? (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.status[0]}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={
                  status === GUEST_CURRENT_STATUSES.SCHEDULED
                    ? "text-sm font-medium"
                    : "text-sm text-muted-foreground"
                }
              >
                {GUEST_CURRENT_STATUS_LABELS.scheduled}
              </span>
              <Switch
                id="add-guest-status"
                checked={status === GUEST_CURRENT_STATUSES.PENDING}
                disabled={isPending}
                onCheckedChange={(checked) =>
                  setValue(
                    "status",
                    checked
                      ? GUEST_CURRENT_STATUSES.PENDING
                      : GUEST_CURRENT_STATUSES.SCHEDULED,
                    { shouldValidate: true }
                  )
                }
                aria-label="Initial status pending"
              />
              <span
                className={
                  status === GUEST_CURRENT_STATUSES.PENDING
                    ? "text-sm font-medium"
                    : "text-sm text-muted-foreground"
                }
              >
                {GUEST_CURRENT_STATUS_LABELS.pending}
              </span>
            </div>
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
          <Button type="submit" form="add-guest-form" disabled={isPending}>
            {isPending ? (
              <>
                <InlineSpinner />
                Creating
              </>
            ) : (
              "Create guest"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
