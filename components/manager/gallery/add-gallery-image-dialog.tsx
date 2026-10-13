"use client";

import { useEffect, useState } from "react";
import { DicesIcon } from "lucide-react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import { createGalleryImageAction } from "@/app/manager/gallery/actions";
import { FieldLabel } from "@/components/auth/field-label";
import { GalleryImageDropzone } from "@/components/manager/gallery/gallery-image-dropzone";
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
import { generateGalleryImageName } from "@/lib/manager/gallery/generate-gallery-image-name";
import { validateGalleryImageClientFile } from "@/lib/manager/gallery/validate-client-file";
import { cn } from "@/lib/utils";
import {
  createGalleryImageSchema,
  type CreateGalleryImageInput,
} from "@/lib/validators/manager/create-gallery-image";
import type {
  CreateGalleryImageActionState,
  ManagerGalleryImageRow,
} from "@/types/manager-gallery-image";

const initialState: CreateGalleryImageActionState = {};

const emptyDefaults = {
  name: "",
  file: undefined as unknown as File,
};

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
  const [fileInputKey, setFileInputKey] = useState(0);
  const [clientFileError, setClientFileError] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState(
    createGalleryImageAction,
    initialState
  );

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
    schema: createGalleryImageSchema,
    mode: "onBlur",
    defaultValues: emptyDefaults,
  });

  const selectedFile = watch("file");
  const { ref: nameRef, ...nameRegister } = register("name");

  useEffect(() => {
    if (!open) {
      reset(emptyDefaults);
      setClientFileError(null);
      setFileInputKey((key) => key + 1);
    }
  }, [open, reset]);

  useActionStateSuccess(state, isPending, (nextState) => {
    onOpenChange(false);
    if (nextState.image) {
      onImageCreated(nextState.image);
    }
  });

  function handleGenerateName() {
    if (isPending) {
      return;
    }
    setValue("name", generateGalleryImageName(), {
      shouldValidate: true,
      shouldDirty: true,
    });
  }

  function onSubmit(values: CreateGalleryImageInput) {
    const checked = validateGalleryImageClientFile(values.file);
    if (!checked.ok) {
      setClientFileError(checked.error);
      return;
    }

    const formData = new FormData();
    formData.set("name", values.name.trim());
    formData.set("file", values.file);

    formAction(formData);
  }

  const nameError = errors.name?.message ?? state.fieldErrors?.name?.[0];
  const fileError =
    clientFileError ?? errors.file?.message ?? state.fieldErrors?.file?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Add gallery image</DialogTitle>
          <DialogDescription>
            Upload an image (JPEG, PNG, WebP, or GIF, max 15 MB). It is
            optimized and stored in Supabase Storage.
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
            <div className="relative">
              <Input
                id="add-gallery-image-name"
                aria-invalid={!!nameError}
                disabled={isPending}
                className="pr-9"
                {...nameRegister}
                ref={nameRef}
              />
              <button
                type="button"
                tabIndex={-1}
                disabled={isPending}
                onClick={handleGenerateName}
                className={cn(
                  "absolute top-1/2 right-2.5 -translate-y-1/2 rounded-sm text-muted-foreground transition-colors",
                  "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  "disabled:pointer-events-none disabled:opacity-50"
                )}
                aria-label="Generate random name"
                title="Generate random name"
              >
                <DicesIcon className="size-4" aria-hidden="true" />
              </button>
            </div>
            {nameError ? (
              <p className="text-sm text-destructive">{nameError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-gallery-image-file"
              label="Image"
              hint="Required"
            />
            <GalleryImageDropzone
              id="add-gallery-image-file"
              disabled={isPending}
              isUploading={isPending}
              inputKey={fileInputKey}
              selectedFile={selectedFile instanceof File ? selectedFile : null}
              error={fileError}
              onFileAccepted={(file) => {
                setClientFileError(null);
                setValue("file", file, { shouldValidate: true });
              }}
              onFileRejected={(message) => {
                setClientFileError(message);
                setValue("file", undefined as unknown as File, {
                  shouldValidate: true,
                });
                setFileInputKey((key) => key + 1);
              }}
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
          <Button type="submit" form="add-gallery-image-form" disabled={isPending}>
            {isPending ? <InlineSpinner /> : "Add image"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
