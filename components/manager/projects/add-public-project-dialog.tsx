"use client";

import { useActionState, useEffect, useTransition } from "react";
import type {
  FieldValues,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import { createPublicProjectAction } from "@/app/manager/projects/actions";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { PublicProjectFormFields } from "@/components/manager/projects/public-project-form-fields";
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
import { PUBLIC_PROJECT_CLASSIFICATION_VALUES } from "@/lib/constants/manager-public-project";
import {
  createPublicProjectSchema,
  type CreatePublicProjectInput,
} from "@/lib/validators/manager/create-public-project";
import type { CreatePublicProjectActionState } from "@/types/manager-public-project";

const initialState: CreatePublicProjectActionState = {};

const emptyDefaults = {
  classification: PUBLIC_PROJECT_CLASSIFICATION_VALUES[0],
  category: "",
  title: "",
  body: "",
  author: "",
  href: "",
  image: undefined,
};

type AddPublicProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated: () => void;
};

export function AddPublicProjectDialog({
  open,
  onOpenChange,
  onProjectCreated,
}: AddPublicProjectDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    createPublicProjectAction,
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
    schema: createPublicProjectSchema,
    mode: "onBlur",
    defaultValues: emptyDefaults,
  });

  const classification = watch("classification");
  const category = watch("category");
  const title = watch("title");
  const selectedImage = watch("image");

  useEffect(() => {
    if (!open) {
      reset(emptyDefaults);
    }
  }, [open, reset]);

  useActionStateSuccess(state, isPending, () => {
    onOpenChange(false);
    onProjectCreated();
  });

  function onSubmit(values: CreatePublicProjectInput) {
    const formData = new FormData();
    formData.set("classification", values.classification);
    formData.set("category", values.category.trim());
    formData.set("title", values.title.trim());
    formData.set("body", values.body.trim());
    formData.set("author", values.author ?? "");
    if (values.image instanceof File) {
      formData.set("image", values.image);
    }
    formData.set("href", values.href ?? "");

    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Add project</DialogTitle>
          <DialogDescription>
            Add a project card for the public projects page.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-public-project-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1"
          noValidate
        >
          <PublicProjectFormFields
            idPrefix="add-project"
            register={register as unknown as UseFormRegister<FieldValues>}
            setValue={setValue as unknown as UseFormSetValue<FieldValues>}
            classification={classification}
            category={category ?? ""}
            errors={{
              classification:
                errors.classification?.message ??
                state.fieldErrors?.classification?.[0],
              category:
                errors.category?.message ?? state.fieldErrors?.category?.[0],
              title: errors.title?.message ?? state.fieldErrors?.title?.[0],
              author: errors.author?.message ?? state.fieldErrors?.author?.[0],
              body: errors.body?.message ?? state.fieldErrors?.body?.[0],
              image: errors.image?.message ?? state.fieldErrors?.image?.[0],
              href: errors.href?.message ?? state.fieldErrors?.href?.[0],
            }}
            isPending={isPending}
            imageRequired={false}
            currentImageAlt={title}
            selectedImageName={
              selectedImage instanceof File ? selectedImage.name : null
            }
            fileInputKey={open ? "open" : "closed"}
          />
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
            form="add-public-project-form"
            disabled={isPending}
          >
            {isPending ? <InlineSpinner /> : "Add project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
