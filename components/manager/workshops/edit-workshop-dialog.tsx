"use client";

import { useActionState, useEffect, useTransition } from "react";
import { updateWorkshopAction } from "@/app/manager/workshops/actions";
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
  WORKSHOP_OFFERING_TYPE_LABELS,
  WORKSHOP_OFFERING_TYPE_VALUES,
} from "@/lib/constants/manager-workshop-display";
import { WORKSHOP_FIELD_LIMITS } from "@/lib/constants/workshop-field-limits";
import {
  updateWorkshopSchema,
  type UpdateWorkshopInput,
} from "@/lib/validators/manager/update-workshop";
import { cn } from "@/lib/utils";
import type {
  ManagerWorkshopRow,
  UpdateWorkshopActionState,
} from "@/types/manager-workshop";

const textareaClassName = cn(
  "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
);

const initialState: UpdateWorkshopActionState = {};

type EditWorkshopDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workshop: ManagerWorkshopRow;
  onWorkshopUpdated: (workshop: ManagerWorkshopRow) => void;
};

function toFormDefaults(workshop: ManagerWorkshopRow) {
  return {
    id: workshop.id,
    name: workshop.name,
    type: workshop.type,
    phone: workshop.phone ?? "",
    subject: workshop.subject ?? "",
    target_audience: workshop.target_audience ?? "",
    proposal_notes: workshop.proposal_notes ?? "",
    delivery_place: workshop.delivery_place ?? "",
    nb_participants: (workshop.nb_participants ?? "") as unknown as number | null,
    price: (workshop.price ?? "") as unknown as number | null,
    start_date: workshop.start_date ?? "",
    end_date: workshop.end_date ?? "",
  };
}

export function EditWorkshopDialog({
  open,
  onOpenChange,
  workshop,
  onWorkshopUpdated,
}: EditWorkshopDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateWorkshopAction,
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
    schema: updateWorkshopSchema,
    mode: "onBlur",
    defaultValues: toFormDefaults(workshop),
  });

  const offeringType = watch("type");

  useEffect(() => {
    if (open) {
      reset(toFormDefaults(workshop));
    }
  }, [open, workshop, reset]);

  useActionStateSuccess(state, isPending, (next) => {
    if (next.workshop) {
      onWorkshopUpdated(next.workshop);
    }
    onOpenChange(false);
  });

  function onSubmit(values: UpdateWorkshopInput) {
    const formData = new FormData();
    formData.set("id", values.id);
    formData.set("name", values.name.trim());
    formData.set("type", values.type);
    formData.set("phone", values.phone ?? "");
    formData.set("subject", values.subject ?? "");
    formData.set("target_audience", values.target_audience ?? "");
    formData.set("proposal_notes", values.proposal_notes ?? "");
    formData.set("delivery_place", values.delivery_place ?? "");
    formData.set(
      "nb_participants",
      values.nb_participants == null ? "" : String(values.nb_participants)
    );
    formData.set("price", values.price == null ? "" : String(values.price));
    formData.set("start_date", values.start_date ?? "");
    formData.set("end_date", values.end_date ?? "");

    startTransition(() => {
      formAction(formData);
    });
  }

  const nameError = errors.name?.message ?? state.fieldErrors?.name?.[0];
  const typeError = errors.type?.message ?? state.fieldErrors?.type?.[0];
  const phoneError = errors.phone?.message ?? state.fieldErrors?.phone?.[0];
  const subjectError =
    errors.subject?.message ?? state.fieldErrors?.subject?.[0];
  const audienceError =
    errors.target_audience?.message ?? state.fieldErrors?.target_audience?.[0];
  const notesError =
    errors.proposal_notes?.message ?? state.fieldErrors?.proposal_notes?.[0];
  const placeError =
    errors.delivery_place?.message ?? state.fieldErrors?.delivery_place?.[0];
  const participantsError =
    errors.nb_participants?.message ?? state.fieldErrors?.nb_participants?.[0];
  const priceError = errors.price?.message ?? state.fieldErrors?.price?.[0];
  const startError =
    errors.start_date?.message ?? state.fieldErrors?.start_date?.[0];
  const endError = errors.end_date?.message ?? state.fieldErrors?.end_date?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Edit workshop</DialogTitle>
          <DialogDescription>
            Update workshop details. Status is managed separately.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-workshop-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1"
          noValidate
        >
          <input type="hidden" {...register("id")} />

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-workshop-name"
              label="Name"
              hint="Required"
            />
            <Input
              id="edit-workshop-name"
              maxLength={WORKSHOP_FIELD_LIMITS.name.max}
              aria-invalid={!!nameError}
              disabled={isPending}
              {...register("name")}
            />
            {nameError ? (
              <p className="text-sm text-destructive">{nameError}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="edit-workshop-type"
                label="Type"
                hint="Required"
              />
              <Select
                value={offeringType}
                onValueChange={(value) => {
                  if (!value) return;
                  setValue("type", value as UpdateWorkshopInput["type"], {
                    shouldValidate: true,
                  });
                }}
                disabled={isPending}
              >
                <SelectTrigger
                  id="edit-workshop-type"
                  aria-invalid={!!typeError}
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORKSHOP_OFFERING_TYPE_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {WORKSHOP_OFFERING_TYPE_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {typeError ? (
                <p className="text-sm text-destructive">{typeError}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="edit-workshop-phone"
                label="Phone"
                hint="Optional"
              />
              <Input
                id="edit-workshop-phone"
                type="tel"
                maxLength={WORKSHOP_FIELD_LIMITS.phone.max}
                aria-invalid={!!phoneError}
                disabled={isPending}
                {...register("phone")}
              />
              {phoneError ? (
                <p className="text-sm text-destructive">{phoneError}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-workshop-subject"
              label="Subject"
              hint="Optional"
            />
            <Input
              id="edit-workshop-subject"
              maxLength={WORKSHOP_FIELD_LIMITS.subject.max}
              aria-invalid={!!subjectError}
              disabled={isPending}
              {...register("subject")}
            />
            {subjectError ? (
              <p className="text-sm text-destructive">{subjectError}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="edit-workshop-participants"
                label="Participants"
                hint="Optional"
              />
              <Input
                id="edit-workshop-participants"
                type="number"
                min={WORKSHOP_FIELD_LIMITS.nb_participants.min}
                max={WORKSHOP_FIELD_LIMITS.nb_participants.max}
                aria-invalid={!!participantsError}
                disabled={isPending}
                {...register("nb_participants")}
              />
              {participantsError ? (
                <p className="text-sm text-destructive">{participantsError}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-workshop-price"
              label="Price"
              hint="Optional"
            />
            <Input
              id="edit-workshop-price"
              type="number"
              min={WORKSHOP_FIELD_LIMITS.price.min}
              max={WORKSHOP_FIELD_LIMITS.price.max}
              step="0.01"
              aria-invalid={!!priceError}
              disabled={isPending}
              {...register("price")}
            />
            {priceError ? (
              <p className="text-sm text-destructive">{priceError}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="edit-workshop-start"
                label="Start date"
                hint="Optional"
              />
              <Input
                id="edit-workshop-start"
                type="date"
                aria-invalid={!!startError}
                disabled={isPending}
                {...register("start_date")}
              />
              {startError ? (
                <p className="text-sm text-destructive">{startError}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="edit-workshop-end"
                label="End date"
                hint="Optional"
              />
              <Input
                id="edit-workshop-end"
                type="date"
                aria-invalid={!!endError}
                disabled={isPending}
                {...register("end_date")}
              />
              {endError ? (
                <p className="text-sm text-destructive">{endError}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-workshop-audience"
              label="Target audience"
              hint="Optional"
            />
            <Input
              id="edit-workshop-audience"
              maxLength={WORKSHOP_FIELD_LIMITS.target_audience.max}
              aria-invalid={!!audienceError}
              disabled={isPending}
              {...register("target_audience")}
            />
            {audienceError ? (
              <p className="text-sm text-destructive">{audienceError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-workshop-place"
              label="Delivery place"
              hint="Optional"
            />
            <Input
              id="edit-workshop-place"
              maxLength={WORKSHOP_FIELD_LIMITS.delivery_place.max}
              aria-invalid={!!placeError}
              disabled={isPending}
              {...register("delivery_place")}
            />
            {placeError ? (
              <p className="text-sm text-destructive">{placeError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-workshop-notes"
              label="Proposal notes"
              hint="Optional"
            />
            <textarea
              id="edit-workshop-notes"
              rows={3}
              maxLength={WORKSHOP_FIELD_LIMITS.proposal_notes.max}
              aria-invalid={!!notesError}
              disabled={isPending}
              className={textareaClassName}
              {...register("proposal_notes")}
            />
            {notesError ? (
              <p className="text-sm text-destructive">{notesError}</p>
            ) : null}
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
          <Button type="submit" form="edit-workshop-form" disabled={isPending}>
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
