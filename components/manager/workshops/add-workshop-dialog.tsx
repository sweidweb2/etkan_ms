"use client";

import { useActionState, useEffect, useTransition } from "react";
import { createWorkshopAction } from "@/app/manager/workshops/actions";
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
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useZodForm } from "@/hooks/use-zod-form";
import {
  createWorkshopSchema,
  type CreateWorkshopInput,
} from "@/lib/validators/manager/create-workshop";
import { cn } from "@/lib/utils";
import type { CreateWorkshopActionState } from "@/types/manager-workshop";

const textareaClassName = cn(
  "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
);

const initialState: CreateWorkshopActionState = {};

const emptyDefaults = {
  name: "",
  subject: "",
  target_audience: "",
  proposal_notes: "",
  delivery_place: "",
  nb_participants: "" as unknown as number | null,
  number_of_sessions: "" as unknown as number | null,
  price: "" as unknown as number | null,
  start_date: "",
  end_date: "",
};

type AddWorkshopDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWorkshopCreated: () => void;
};

export function AddWorkshopDialog({
  open,
  onOpenChange,
  onWorkshopCreated,
}: AddWorkshopDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    createWorkshopAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;

  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  useActionStateToast(state, isPending);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useZodForm({
    schema: createWorkshopSchema,
    mode: "onBlur",
    defaultValues: emptyDefaults,
  });

  useEffect(() => {
    if (!open) {
      reset(emptyDefaults);
    }
  }, [open, reset]);

  useActionStateSuccess(state, isPending, () => {
    onOpenChange(false);
    onWorkshopCreated();
  });

  function onSubmit(values: CreateWorkshopInput) {
    const formData = new FormData();
    formData.set("name", values.name.trim());
    formData.set("subject", values.subject ?? "");
    formData.set("target_audience", values.target_audience ?? "");
    formData.set("proposal_notes", values.proposal_notes ?? "");
    formData.set("delivery_place", values.delivery_place ?? "");
    formData.set(
      "nb_participants",
      values.nb_participants == null ? "" : String(values.nb_participants)
    );
    formData.set(
      "number_of_sessions",
      values.number_of_sessions == null
        ? ""
        : String(values.number_of_sessions)
    );
    formData.set("price", values.price == null ? "" : String(values.price));
    formData.set("start_date", values.start_date ?? "");
    formData.set("end_date", values.end_date ?? "");

    startTransition(() => {
      formAction(formData);
    });
  }

  const nameError = errors.name?.message ?? state.fieldErrors?.name?.[0];
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
  const sessionsError =
    errors.number_of_sessions?.message ??
    state.fieldErrors?.number_of_sessions?.[0];
  const priceError = errors.price?.message ?? state.fieldErrors?.price?.[0];
  const startError =
    errors.start_date?.message ?? state.fieldErrors?.start_date?.[0];
  const endError = errors.end_date?.message ?? state.fieldErrors?.end_date?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Create workshop</DialogTitle>
          <DialogDescription>
            New workshops start as draft. Status changes come later from the
            detail page.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-workshop-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="add-workshop-name" label="Name" hint="Required" />
            <Input
              id="add-workshop-name"
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
              htmlFor="add-workshop-subject"
              label="Subject"
              hint="Optional"
            />
            <Input
              id="add-workshop-subject"
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
                htmlFor="add-workshop-participants"
                label="Participants"
                hint="Optional"
              />
              <Input
                id="add-workshop-participants"
                type="number"
                min="0"
                aria-invalid={!!participantsError}
                disabled={isPending}
                {...register("nb_participants")}
              />
              {participantsError ? (
                <p className="text-sm text-destructive">{participantsError}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="add-workshop-sessions"
                label="Sessions"
                hint="Optional"
              />
              <Input
                id="add-workshop-sessions"
                type="number"
                min="1"
                aria-invalid={!!sessionsError}
                disabled={isPending}
                {...register("number_of_sessions")}
              />
              {sessionsError ? (
                <p className="text-sm text-destructive">{sessionsError}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-workshop-price"
              label="Price"
              hint="Optional"
            />
            <Input
              id="add-workshop-price"
              type="number"
              min="0"
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
                htmlFor="add-workshop-start"
                label="Start date"
                hint="Optional"
              />
              <Input
                id="add-workshop-start"
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
                htmlFor="add-workshop-end"
                label="End date"
                hint="Optional"
              />
              <Input
                id="add-workshop-end"
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
              htmlFor="add-workshop-audience"
              label="Target audience"
              hint="Optional"
            />
            <Input
              id="add-workshop-audience"
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
              htmlFor="add-workshop-place"
              label="Delivery place"
              hint="Optional"
            />
            <Input
              id="add-workshop-place"
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
              htmlFor="add-workshop-notes"
              label="Proposal notes"
              hint="Optional"
            />
            <textarea
              id="add-workshop-notes"
              rows={3}
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
          <Button type="submit" form="add-workshop-form" disabled={isPending}>
            {isPending ? (
              <>
                <InlineSpinner className="mr-2" />
                Creating…
              </>
            ) : (
              "Create workshop"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
