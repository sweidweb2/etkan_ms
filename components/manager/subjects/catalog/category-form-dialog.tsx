"use client";

import { useActionState, useEffect, useTransition } from "react";
import {
  createCategoryAction,
  updateCategoryAction,
} from "@/app/manager/subjects/catalog/actions";
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
  createCategorySchema,
  type CreateCategoryInput,
} from "@/lib/validators/manager/create-category";
import {
  updateCategorySchema,
  type UpdateCategoryInput,
} from "@/lib/validators/manager/update-category";
import type {
  CreateCategoryActionState,
  ManagerCategoryRow,
  UpdateCategoryActionState,
} from "@/types/manager-category";

const NONE_PARENT = "__none__";

type CategoryFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ManagerCategoryRow[];
  category?: ManagerCategoryRow | null;
  onSaved: (category: ManagerCategoryRow) => void;
};

export function CategoryFormDialog({
  open,
  onOpenChange,
  categories,
  category = null,
  onSaved,
}: CategoryFormDialogProps) {
  const isEdit = Boolean(category);
  const [isTransitionPending, startTransition] = useTransition();
  const [createState, createAction, isCreatePending] = useActionState(
    createCategoryAction,
    {} as CreateCategoryActionState
  );
  const [updateState, updateAction, isUpdatePending] = useActionState(
    updateCategoryAction,
    {} as UpdateCategoryActionState
  );
  const state = isEdit ? updateState : createState;
  const isPending =
    isTransitionPending || (isEdit ? isUpdatePending : isCreatePending);
  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  useActionStateToast(state, isPending);

  const parentOptions = categories.filter((row) => row.id !== category?.id);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useZodForm({
    schema: isEdit ? updateCategorySchema : createCategorySchema,
    mode: "onBlur",
    defaultValues: {
      id: category?.id,
      name: category?.name ?? "",
      parent_id: category?.parent_id ?? "",
    },
  });

  const parentId = watch("parent_id") ?? "";

  useEffect(() => {
    if (!open) {
      return;
    }
    reset({
      id: category?.id,
      name: category?.name ?? "",
      parent_id: category?.parent_id ?? "",
    });
  }, [open, category, reset]);

  useActionStateSuccess(state, isPending, (next) => {
    onOpenChange(false);
    if (next.category) {
      onSaved(next.category);
    }
  });

  function onSubmit(values: CreateCategoryInput | UpdateCategoryInput) {
    const formData = new FormData();
    if (isEdit && "id" in values) {
      formData.set("id", values.id);
    }
    formData.set("name", values.name.trim());
    formData.set("parent_id", values.parent_id?.trim() ?? "");
    startTransition(() => {
      if (isEdit) {
        updateAction(formData);
      } else {
        createAction(formData);
      }
    });
  }

  const nameError = errors.name?.message ?? state.fieldErrors?.name?.[0];
  const parentError =
    errors.parent_id?.message ?? state.fieldErrors?.parent_id?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit category" : "Add category"}
          </DialogTitle>
          <DialogDescription>
            Categories can nest under a parent. Names must be unique.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="category-name" error={Boolean(nameError)}>
              Name
            </FieldLabel>
            <Input
              id="category-name"
              disabled={isPending}
              aria-invalid={Boolean(nameError)}
              {...register("name")}
            />
            {nameError ? (
              <p className="text-sm text-destructive">{nameError}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="category-parent" error={Boolean(parentError)}>
              Parent
            </FieldLabel>
            <Select
              value={parentId || NONE_PARENT}
              disabled={isPending}
              onValueChange={(value) =>
                setValue("parent_id", value === NONE_PARENT ? "", {
                  shouldDirty: true,
                })
              }
            >
              <SelectTrigger id="category-parent" className="w-full">
                <SelectValue placeholder="No parent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_PARENT}>No parent</SelectItem>
                {parentOptions.map((row) => (
                  <SelectItem key={row.id} value={row.id}>
                    {row.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {parentError ? (
              <p className="text-sm text-destructive">{parentError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <InlineSpinner /> : null}
              {isEdit ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
