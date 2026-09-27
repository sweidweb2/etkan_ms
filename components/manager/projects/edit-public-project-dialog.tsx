"use client";

import { useEffect, useTransition } from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import type {
  FieldValues,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import { updatePublicProjectAction } from "@/app/manager/projects/actions";
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
import {
  updatePublicProjectSchema,
  type UpdatePublicProjectInput,
} from "@/lib/validators/manager/update-public-project";
import type {
  ManagerPublicProjectRow,
  UpdatePublicProjectActionState,
} from "@/types/manager-public-project";

const initialState: UpdatePublicProjectActionState = {};

type EditPublicProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ManagerPublicProjectRow | null;
  onProjectUpdated: () => void;
};

export function EditPublicProjectDialog({
  open,
  onOpenChange,
  project,
  onProjectUpdated,
}: EditPublicProjectDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updatePublicProjectAction,
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
    schema: updatePublicProjectSchema,
    mode: "onBlur",
    defaultValues: {
      id: project?.id ?? "",
      classification: project?.classification ?? "students",
      category: project?.category ?? "",
      title: project?.title ?? "",
      body: project?.body ?? "",
      author: project?.author ?? "",
      href: project?.href ?? "",
    },
  });

  const classification = watch("classification");
  const category = watch("category");
  const title = watch("title");
  const selectedImage = watch("image");

  useEffect(() => {
    if (!open || !project) {
      return;
    }

    reset({
      id: project.id,
      classification: project.classification,
      category: project.category,
      title: project.title,
      body: project.body,
      author: project.author ?? "",
      href: project.href ?? "",
      image: undefined,
    });
  }, [open, project, reset]);

  useActionStateSuccess(state, isPending, () => {
    onOpenChange(false);
    onProjectUpdated();
  });

  function onSubmit(values: UpdatePublicProjectInput) {
    const formData = new FormData();
    formData.set("id", values.id);
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
          <DialogTitle>Edit project</DialogTitle>
          <DialogDescription>
            Update the public project card for{" "}
            {project?.title ?? "this project"}.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-public-project-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1"
          noValidate
        >
          <input type="hidden" {...register("id")} />
          <PublicProjectFormFields
            idPrefix="edit-project"
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
            currentImageUrl={project?.image_url}
            currentImageAlt={title || project?.title}
            selectedImageName={
              selectedImage instanceof File ? selectedImage.name : null
            }
            fileInputKey={open ? project?.id ?? "open" : "closed"}
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
            form="edit-public-project-form"
            disabled={!project || isPending}
          >
            {isPending ? <InlineSpinner /> : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
