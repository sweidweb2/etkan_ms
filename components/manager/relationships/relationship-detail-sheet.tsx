"use client";

import { useActionState, useEffect, useTransition } from "react";
import { format } from "date-fns";
import { updateRelationshipAction } from "@/app/manager/relationships/actions";
import { FieldLabel } from "@/components/auth/field-label";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useZodForm } from "@/hooks/use-zod-form";
import { AUTH_LIMITS } from "@/lib/constants/auth-limits";
import {
  updateRelationshipSchema,
  type UpdateRelationshipInput,
} from "@/lib/validators/manager/update-relationship";
import type {
  ManagerRelationshipRow,
  UpdateRelationshipActionState,
} from "@/types/manager-relationship";

const initialState: UpdateRelationshipActionState = {};

type RelationshipDetailFormProps = {
  open: boolean;
  relationship: ManagerRelationshipRow;
  onOpenChange: (open: boolean) => void;
  onRelationshipUpdated: () => void;
};

function RelationshipDetailForm({
  open,
  relationship,
  onOpenChange,
  onRelationshipUpdated,
}: RelationshipDetailFormProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateRelationshipAction,
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
    schema: updateRelationshipSchema,
    mode: "onBlur",
    defaultValues: {
      id: relationship.id,
      name: relationship.name,
      phone: relationship.phone ?? "",
      relation_with: relationship.relation_with ?? "",
      major: relationship.major ?? "",
      speciality: relationship.speciality ?? "",
      is_useful: relationship.is_useful,
    },
  });

  const isUseful = watch("is_useful");

  useEffect(() => {
    reset({
      id: relationship.id,
      name: relationship.name,
      phone: relationship.phone ?? "",
      relation_with: relationship.relation_with ?? "",
      major: relationship.major ?? "",
      speciality: relationship.speciality ?? "",
      is_useful: relationship.is_useful,
    });
  }, [relationship, reset]);

  useActionStateSuccess(state, isPending, () => {
    handleOpenChange(false);
    onRelationshipUpdated();
  });

  function onSubmit(values: UpdateRelationshipInput) {
    const formData = new FormData();
    formData.set("id", values.id);
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
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md" showCloseButton={!isPending}>
      <SheetHeader>
        <SheetTitle>{relationship.name}</SheetTitle>
        <SheetDescription>
          View and edit relationship contact details.
        </SheetDescription>
      </SheetHeader>

      <form
        id="relationship-detail-form"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-1 flex-col gap-4 overflow-y-auto px-4"
        noValidate
      >
        <input type="hidden" {...register("id")} />

        <div className="flex flex-col gap-2">
          <FieldLabel
            htmlFor="relationship-name"
            label="Contact name"
            hint="Required"
          />
          <Input
            id="relationship-name"
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
            htmlFor="relationship-phone"
            label="Phone"
            hint="Optional"
          />
          <Input
            id="relationship-phone"
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
            htmlFor="relationship-relation"
            label="Relation"
            hint="Optional"
          />
          <Input
            id="relationship-relation"
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
            htmlFor="relationship-major"
            label="Major"
            hint="Optional"
          />
          <Input
            id="relationship-major"
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
            htmlFor="relationship-speciality"
            label="Speciality"
            hint="Optional"
          />
          <Input
            id="relationship-speciality"
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
            <Label htmlFor="relationship-useful">Useful contact</Label>
            <p className="text-xs text-muted-foreground">
              Mark whether this relationship is helpful for follow-up.
            </p>
          </div>
          <Switch
            id="relationship-useful"
            checked={isUseful}
            disabled={isPending}
            onCheckedChange={(checked) =>
              setValue("is_useful", checked, { shouldValidate: true })
            }
            aria-label="Useful contact"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="relationship-created">Created</Label>
          <Input
            id="relationship-created"
            value={format(new Date(relationship.created_at), "MMM d, yyyy 'at' h:mm a")}
            readOnly
            disabled
          />
        </div>
      </form>

      <SheetFooter className="flex-row justify-end gap-2 border-t pt-4">
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
          form="relationship-detail-form"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <InlineSpinner className="mr-2" />
              Saving…
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

type RelationshipDetailSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relationship: ManagerRelationshipRow | null;
  onRelationshipUpdated: () => void;
};

export function RelationshipDetailSheet({
  open,
  onOpenChange,
  relationship,
  onRelationshipUpdated,
}: RelationshipDetailSheetProps) {
  if (!relationship) {
    return null;
  }

  return (
    <RelationshipDetailForm
      key={relationship.id}
      open={open}
      relationship={relationship}
      onOpenChange={onOpenChange}
      onRelationshipUpdated={onRelationshipUpdated}
    />
  );
}
