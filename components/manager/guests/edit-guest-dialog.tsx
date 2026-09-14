"use client";

import { useActionState, useEffect, useTransition } from "react";
import type { FieldValues, UseFormRegister, UseFormSetValue } from "react-hook-form";
import { updateGuestAction } from "@/app/manager/guests/actions";
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
  updateGuestSchema,
  type UpdateGuestInput,
} from "@/lib/validators/manager/update-guest";
import type {
  ManagerGuestRow,
  UpdateGuestActionState,
} from "@/types/manager-guest";

const initialState: UpdateGuestActionState = {};

type EditGuestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guest: ManagerGuestRow;
  onGuestUpdated: (guest: ManagerGuestRow) => void;
};

export function EditGuestDialog({
  open,
  onOpenChange,
  guest,
  onGuestUpdated,
}: EditGuestDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateGuestAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;
  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  useActionStateToast(state, isPending);

  const defaults: UpdateGuestInput = {
    id: guest.id,
    full_name: guest.full_name,
    phone: guest.phone,
    age: guest.age,
    school_or_university: guest.school_or_university,
    education_level: guest.education_level,
    interested_service: guest.interested_service,
    referred_from: guest.referred_from,
    referred_from_other: guest.referred_from_other,
    notes: guest.notes,
  };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useZodForm({
    schema: updateGuestSchema,
    mode: "onBlur",
    defaultValues: defaults,
  });

  const educationLevel = watch("education_level");
  const interestedService = watch("interested_service");
  const referredFrom = watch("referred_from");

  useEffect(() => {
    if (open) {
      reset({
        id: guest.id,
        full_name: guest.full_name,
        phone: guest.phone,
        age: guest.age,
        school_or_university: guest.school_or_university,
        education_level: guest.education_level,
        interested_service: guest.interested_service,
        referred_from: guest.referred_from,
        referred_from_other: guest.referred_from_other,
        notes: guest.notes,
      });
    }
  }, [open, guest, reset]);

  useActionStateSuccess(state, isPending, (nextState) => {
    onOpenChange(false);
    if (nextState.guest) {
      onGuestUpdated(nextState.guest);
    }
  });

  function onSubmit(values: UpdateGuestInput) {
    const formData = new FormData();
    formData.set("id", values.id);
    formData.set("full_name", values.full_name.trim());
    formData.set("phone", values.phone ?? "");
    formData.set("age", values.age == null ? "" : String(values.age));
    formData.set("school_or_university", values.school_or_university ?? "");
    formData.set("education_level", values.education_level ?? "");
    formData.set("interested_service", values.interested_service ?? "");
    formData.set("referred_from", values.referred_from ?? "");
    formData.set("referred_from_other", values.referred_from_other ?? "");
    formData.set("notes", values.notes ?? "");

    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Edit guest</DialogTitle>
          <DialogDescription>
            Update intake fields. Status changes are managed separately.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-guest-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1"
          noValidate
        >
          <input type="hidden" {...register("id")} />
          <GuestFormFields
            idPrefix="edit-guest"
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
          <Button type="submit" form="edit-guest-form" disabled={isPending}>
            {isPending ? (
              <>
                <InlineSpinner />
                Saving
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
