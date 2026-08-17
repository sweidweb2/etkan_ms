"use client";

import { useActionState, useEffect, useTransition } from "react";
import type { FieldValues, UseFormRegister, UseFormSetValue } from "react-hook-form";
import { createGuestAction } from "@/app/manager/guests/actions";
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
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useZodForm } from "@/hooks/use-zod-form";
import {
  GUEST_EDUCATION_LEVELS,
  GUEST_INTERESTED_SERVICES,
} from "@/lib/constants/guest";
import {
  createGuestSchema,
  type CreateGuestInput,
} from "@/lib/validators/manager/create-guest";
import type { CreateGuestActionState } from "@/types/manager-guest";

const initialState: CreateGuestActionState = {};

const emptyDefaults: CreateGuestInput = {
  full_name: "",
  phone: "",
  age: 18,
  school_or_university: null,
  education_level: GUEST_EDUCATION_LEVELS.SCHOOL,
  interested_service: GUEST_INTERESTED_SERVICES.ETKAN_ROADMAP,
  notes: null,
};

type AddGuestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGuestCreated: () => void;
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

  useEffect(() => {
    if (!open) {
      reset(emptyDefaults);
    }
  }, [open, reset]);

  useActionStateSuccess(state, isPending, () => {
    onOpenChange(false);
    onGuestCreated();
  });

  function onSubmit(values: CreateGuestInput) {
    const formData = new FormData();
    formData.set("full_name", values.full_name.trim());
    formData.set("phone", values.phone.trim());
    formData.set("age", String(values.age));
    formData.set("school_or_university", values.school_or_university ?? "");
    formData.set("education_level", values.education_level);
    formData.set("interested_service", values.interested_service);
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
            Minimal intake card. Status starts as Scheduled; full registration
            comes later from the guest detail page.
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
            educationLevel={educationLevel}
            interestedService={interestedService}
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
              notes: errors.notes?.message ?? state.fieldErrors?.notes?.[0],
            }}
          />
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
