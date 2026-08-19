"use client";

import { useActionState, useEffect, useTransition } from "react";
import { updateGalleryImageAction } from "@/app/manager/gallery/actions";
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
  updateGalleryImageSchema,
  type UpdateGalleryImageInput,
} from "@/lib/validators/manager/update-gallery-image";
import type {
  ManagerGalleryImageRow,
  UpdateGalleryImageActionState,
} from "@/types/manager-gallery-image";

const initialState: UpdateGalleryImageActionState = {};

type EditGalleryImageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  image: ManagerGalleryImageRow | null;
  onImageUpdated: (image: ManagerGalleryImageRow) => void;
};

export function EditGalleryImageDialog({
  open,
  onOpenChange,
  image,
  onImageUpdated,
}: EditGalleryImageDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateGalleryImageAction,
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
    schema: updateGalleryImageSchema,
    mode: "onBlur",
    defaultValues: {
      id: image?.id ?? "",
      name: image?.name ?? "",
      direct_url: image?.direct_url ?? "",
    },
  });

  useEffect(() => {
    if (!open || !image) {
      return;
    }

    reset({
      id: image.id,
      name: image.name,
      direct_url: image.direct_url,
    });
  }, [image, open, reset]);

  useActionStateSuccess(state, isPending, (nextState) => {
    onOpenChange(false);
    if (nextState.image) {
      onImageUpdated(nextState.image);
    }
  });

  function onSubmit(values: UpdateGalleryImageInput) {
    const formData = new FormData();
    formData.set("id", values.id);
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
          <DialogTitle>Edit gallery image</DialogTitle>
          <DialogDescription>
            Update the display name or direct URL for{" "}
            {image?.name ?? "this image"}.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-gallery-image-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <input type="hidden" {...register("id")} />

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-gallery-image-name"
              label="Name"
              hint="Required"
            />
            <Input
              id="edit-gallery-image-name"
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
              htmlFor="edit-gallery-image-direct-url"
              label="Direct URL"
              hint="Required"
            />
            <Input
              id="edit-gallery-image-direct-url"
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
          <Button
            type="submit"
            form="edit-gallery-image-form"
            disabled={!image || isPending}
          >
            {isPending ? <InlineSpinner /> : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
