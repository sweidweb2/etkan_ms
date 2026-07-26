"use client";

import { useActionState, useEffect, useTransition } from "react";
import { createRelationshipAction } from "@/app/manager/relationships/actions";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useZodForm } from "@/hooks/use-zod-form";
import { AUTH_LIMITS } from "@/lib/constants/auth-limits";
import {
  createRelationshipSchema,
  type CreateRelationshipInput,
} from "@/lib/validators/manager/create-relationship";
import type { CreateRelationshipActionState } from "@/types/manager-relationship";

const initialState: CreateRelationshipActionState = {};

type AddRelationshipDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRelationshipCreated: () => void;
};

export function AddRelationshipDialog({
  open,
  onOpenChange,
  onRelationshipCreated,
}: AddRelationshipDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    createRelationshipAction,
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
    schema: createRelationshipSchema,
    mode: "onBlur",
    defaultValues: {
      name: "",
      phone: "",
      relation_with: "",
      major: "",
      speciality: "",
      is_useful: true,
    },
  });

  const isUseful = watch("is_useful");

  useEffect(() => {
    if (!open) {
      reset({
        name: "",
        phone: "",
        relation_with: "",
        major: "",
        speciality: "",
        is_useful: true,
      });
    }
  }, [open, reset]);

  useActionStateSuccess(state, isPending, () => {
    onOpenChange(false);
    onRelationshipCreated();
  });

  function onSubmit(values: CreateRelationshipInput) {
    const formData = new FormData();
    formData.set("name", values.name.trim());
    formData.set("phone", values.phone?.trim() ?? "");
    formData.set("relation_with", values.relation_with?.trim() ?? "");
    formData.set("major", values.major?.trim() ?? "");
    formData.set("speciality", values.speciality?.trim() ?? "");
    formData.set("is_useful", String(values.is_useful));

    startTransition(() => {
      formAction(formData);
    });
  }

  const nameError = errors.name?.message ?? state.fieldErrors?.name?.[0];
  const phoneError = errors.phone?.message ?? state.fieldErrors?.phone?.[0];
  const relationError =
    errors.relation_with?.message ?? state.fieldErrors?.relation_with?.[0];
  const majorError = errors.major?.message ?? state.fieldErrors?.major?.[0];
  const specialityError =
    errors.speciality?.message ?? state.fieldErrors?.speciality?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Add relationship</DialogTitle>
          <DialogDescription>
            Create a standalone contact record for student relationships.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-relationship-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-relationship-name"
              label="Contact name"
              hint="Required"
            />
            <Input
              id="add-relationship-name"
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
              htmlFor="add-relationship-phone"
              label="Phone"
              hint="Optional"
            />
            <Input
              id="add-relationship-phone"
              maxLength={AUTH_LIMITS.phone.max}
              aria-invalid={!!phoneError}
              disabled={isPending}
              {...register("phone")}
            />
            {phoneError ? (
              <p className="text-sm text-destructive">{phoneError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-relationship-relation"
              label="Relation"
              hint="Optional"
            />
            <Input
              id="add-relationship-relation"
              aria-invalid={!!relationError}
              disabled={isPending}
              {...register("relation_with")}
            />
            {relationError ? (
              <p className="text-sm text-destructive">{relationError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-relationship-major"
              label="Major"
              hint="Optional"
            />
            <Input
              id="add-relationship-major"
              aria-invalid={!!majorError}
              disabled={isPending}
              {...register("major")}
            />
            {majorError ? (
              <p className="text-sm text-destructive">{majorError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-relationship-speciality"
              label="Speciality"
              hint="Optional"
            />
            <Input
              id="add-relationship-speciality"
              aria-invalid={!!specialityError}
              disabled={isPending}
              {...register("speciality")}
            />
            {specialityError ? (
              <p className="text-sm text-destructive">{specialityError}</p>
            ) : null}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="add-relationship-useful">Useful contact</Label>
              <p className="text-xs text-muted-foreground">
                Defaults to useful for new relationships.
              </p>
            </div>
            <Switch
              id="add-relationship-useful"
              checked={isUseful}
              disabled={isPending}
              onCheckedChange={(checked) =>
                setValue("is_useful", checked, { shouldValidate: true })
              }
              aria-label="Useful contact"
            />
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
          <Button
            type="submit"
            form="add-relationship-form"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <InlineSpinner className="mr-2" />
                Creating…
              </>
            ) : (
              "Create relationship"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
