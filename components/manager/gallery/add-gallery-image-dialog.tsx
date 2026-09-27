"use client";

import { useEffect, useTransition } from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import { createGalleryImageAction } from "@/app/manager/gallery/actions";
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
  createGalleryImageSchema,
  type CreateGalleryImageInput,
} from "@/lib/validators/manager/create-gallery-image";
import type {
  CreateGalleryImageActionState,
  ManagerGalleryImageRow,
} from "@/types/manager-gallery-image";

const initialState: CreateGalleryImageActionState = {};

type AddGalleryImageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImageCreated: (image: ManagerGalleryImageRow) => void;
};

export function AddGalleryImageDialog({
  open,
  onOpenChange,
  onImageCreated,
}: AddGalleryImageDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    createGalleryImageAction,
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
    schema: createGalleryImageSchema,
    mode: "onBlur",
    defaultValues: {
      name: "",
      direct_url: "",
    },
  });

  useEffect(() => {
    if (!open) {
      reset({
        name: "",
        direct_url: "",
      });
    }
  }, [open, reset]);

  useActionStateSuccess(state, isPending, (nextState) => {
    onOpenChange(false);
    if (nextState.image) {
      onImageCreated(nextState.image);
    }
  });

  function onSubmit(values: CreateGalleryImageInput) {
    const formData = new FormData();
    formData.set("name", values.name.trim());
    formData.set("direct_url", values.direct_url.trim());

    startTransition(() => {
      formAction(formData);
    });
  }

  const nameError = errors.name?.message ?? state.fieldErrors?.name?.[0];
  const directUrlError =
    errors.direct_url?.message ?? state.fieldErrors?.direct_url?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Add gallery image</DialogTitle>
          <DialogDescription>
            Add a display name and direct image URL for the public gallery.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-gallery-image-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-gallery-image-name"
              label="Name"
              hint="Required"
            />
            <Input
              id="add-gallery-image-name"
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
              htmlFor="add-gallery-image-direct-url"
              label="Direct URL"
              hint="Required"
            />
            <Input
              id="add-gallery-image-direct-url"
              type="url"
              placeholder="https://"
              aria-invalid={!!directUrlError}
              disabled={isPending}
              {...register("direct_url")}
            />
            {directUrlError ? (
              <p className="text-sm text-destructive">{directUrlError}</p>
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
          <Button type="submit" form="add-gallery-image-form" disabled={isPending}>
            {isPending ? <InlineSpinner /> : "Add image"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
