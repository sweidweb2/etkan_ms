"use client";

import { useActionState, useEffect, useTransition } from "react";
import { renameWorkshopDocumentAction } from "@/app/manager/workshops/actions";
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
  renameWorkshopDocumentSchema,
  type RenameWorkshopDocumentInput,
} from "@/lib/validators/manager/workshop-document";
import type {
  ManagerWorkshopDocumentRow,
  RenameWorkshopDocumentActionState,
} from "@/types/manager-workshop";

const initialState: RenameWorkshopDocumentActionState = {};

type RenameWorkshopDocumentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: ManagerWorkshopDocumentRow | null;
  onRenamed: (document: ManagerWorkshopDocumentRow) => void;
};

function toFormDefaults(
  document: ManagerWorkshopDocumentRow | null
): RenameWorkshopDocumentInput {
  return {
    id: document?.id ?? "",
    workshop_id: document?.workshop_id ?? "",
    name: document?.name ?? "",
  };
}

export function RenameWorkshopDocumentDialog({
  open,
  onOpenChange,
  document,
  onRenamed,
}: RenameWorkshopDocumentDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    renameWorkshopDocumentAction,
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
    schema: renameWorkshopDocumentSchema,
    mode: "onBlur",
    defaultValues: toFormDefaults(document),
  });

  useEffect(() => {
    if (open) {
      reset(toFormDefaults(document));
    }
  }, [open, document, reset]);

  useActionStateSuccess(state, isPending, (nextState) => {
    if (nextState.document) {
      onRenamed(nextState.document);
    }
    onOpenChange(false);
  });

  function onSubmit(values: RenameWorkshopDocumentInput) {
    const formData = new FormData();
    formData.set("id", values.id);
    formData.set("workshop_id", values.workshop_id);
    formData.set("name", values.name.trim());

    startTransition(() => {
      formAction(formData);
    });
  }

  const nameError = errors.name?.message ?? state.fieldErrors?.name?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Rename document</DialogTitle>
          <DialogDescription>
            Update the display name. The stored file is not moved.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <input type="hidden" {...register("id")} />
          <input type="hidden" {...register("workshop_id")} />

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="rename-workshop-document-name"
              label="Display name"
              hint="Required"
            />
            <Input
              id="rename-workshop-document-name"
              disabled={isPending}
              aria-invalid={Boolean(nameError)}
              {...register("name")}
            />
            {nameError ? (
              <p className="text-sm text-destructive">{nameError}</p>
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
            <Button type="submit" disabled={isPending || !document}>
              {isPending ? <InlineSpinner /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
