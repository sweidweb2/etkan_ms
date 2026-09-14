"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import type { JSONContent } from "@tiptap/react";
import {
  createExerciseAction,
  updateExerciseAction,
} from "@/app/manager/subjects/catalog/actions";
import { FieldLabel } from "@/components/auth/field-label";
import { TiptapExerciseEditor } from "@/components/manager/subjects/catalog/tiptap-exercise-editor";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  EXERCISE_LEVEL_LABELS,
  EXERCISE_LEVEL_VALUES,
  type ExerciseLevelValue,
} from "@/lib/constants/exercise-level";
import {
  EXERCISE_STATUS_LABELS,
  EXERCISE_STATUS_VALUES,
  type ExerciseStatusValue,
} from "@/lib/constants/exercise-status";
import type { ManagerCategoryRow } from "@/types/manager-category";
import type {
  CreateExerciseActionState,
  ManagerExerciseRow,
  UpdateExerciseActionState,
} from "@/types/manager-exercise";
import type { Json } from "@/types/supabase";

const EMPTY_DOC: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

function toJsonContent(body: Json): JSONContent {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    return body as JSONContent;
  }
  return EMPTY_DOC;
}

type ExerciseFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ManagerCategoryRow[];
  exercise?: ManagerExerciseRow | null;
  onSaved: (exercise: ManagerExerciseRow) => void;
};

export function ExerciseFormDialog({
  open,
  onOpenChange,
  categories,
  exercise = null,
  onSaved,
}: ExerciseFormDialogProps) {
  const isEdit = Boolean(exercise);
  const [isTransitionPending, startTransition] = useTransition();
  const [createState, createAction, isCreatePending] = useActionState(
    createExerciseAction,
    {} as CreateExerciseActionState
  );
  const [updateState, updateAction, isUpdatePending] = useActionState(
    updateExerciseAction,
    {} as UpdateExerciseActionState
  );
  const state = isEdit ? updateState : createState;
  const isPending =
    isTransitionPending || (isEdit ? isUpdatePending : isCreatePending);
  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  const [title, setTitle] = useState("");
  const [level, setLevel] = useState<ExerciseLevelValue>("easy");
  const [status, setStatus] = useState<ExerciseStatusValue>("active");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [body, setBody] = useState<JSONContent>(EMPTY_DOC);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  useActionStateToast(state, isPending);

  useEffect(() => {
    if (!open) {
      return;
    }
    setTitle(exercise?.title ?? "");
    setLevel(exercise?.level ?? "easy");
    setStatus(exercise?.status ?? "active");
    setCategoryIds(exercise?.category_ids ?? []);
    setBody(exercise ? toJsonContent(exercise.body) : EMPTY_DOC);
    setClientErrors({});
  }, [open, exercise]);

  useActionStateSuccess(state, isPending, (next) => {
    onOpenChange(false);
    if (next.exercise) {
      onSaved(next.exercise);
    }
  });

  function toggleCategory(id: string, checked: boolean) {
    setCategoryIds((prev) =>
      checked ? [...new Set([...prev, id])] : prev.filter((item) => item !== id)
    );
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!title.trim()) {
      nextErrors.title = "Exercise title is required.";
    }
    if (categoryIds.length === 0) {
      nextErrors.category_ids = "Select at least one category.";
    }
    setClientErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const formData = new FormData();
    if (isEdit && exercise) {
      formData.set("id", exercise.id);
    }
    formData.set("title", title.trim());
    formData.set("level", level);
    formData.set("status", status);
    formData.set("body", JSON.stringify(body));
    for (const id of categoryIds) {
      formData.append("category_ids", id);
    }

    startTransition(() => {
      if (isEdit) {
        updateAction(formData);
      } else {
        createAction(formData);
      }
    });
  }

  const titleError = clientErrors.title ?? state.fieldErrors?.title?.[0];
  const categoriesError =
    clientErrors.category_ids ?? state.fieldErrors?.category_ids?.[0];
  const bodyError = state.fieldErrors?.body?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!isPending}
        className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit exercise" : "Add exercise"}
          </DialogTitle>
          <DialogDescription>
            Exercises require at least one category and a rich-text body.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="exercise-title" error={Boolean(titleError)}>
              Title
            </FieldLabel>
            <Input
              id="exercise-title"
              value={title}
              disabled={isPending}
              aria-invalid={Boolean(titleError)}
              onChange={(event) => setTitle(event.target.value)}
            />
            {titleError ? (
              <p className="text-sm text-destructive">{titleError}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="exercise-level">Level</FieldLabel>
              <Select
                value={level}
                disabled={isPending}
                onValueChange={(value) =>
                  setLevel(value as ExerciseLevelValue)
                }
              >
                <SelectTrigger id="exercise-level" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXERCISE_LEVEL_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {EXERCISE_LEVEL_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="exercise-status">Status</FieldLabel>
              <Select
                value={status}
                disabled={isPending}
                onValueChange={(value) =>
                  setStatus(value as ExerciseStatusValue)
                }
              >
                <SelectTrigger id="exercise-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXERCISE_STATUS_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {EXERCISE_STATUS_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel error={Boolean(categoriesError)}>Categories</FieldLabel>
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Create a category first.
                </p>
              ) : (
                categories.map((category) => {
                  const checked = categoryIds.includes(category.id);
                  const checkboxId = `exercise-category-${category.id}`;
                  return (
                    <label
                      key={category.id}
                      htmlFor={checkboxId}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        id={checkboxId}
                        checked={checked}
                        disabled={isPending}
                        onCheckedChange={(value) =>
                          toggleCategory(category.id, value === true)
                        }
                      />
                      {category.name}
                    </label>
                  );
                })
              )}
            </div>
            {categoriesError ? (
              <p className="text-sm text-destructive">{categoriesError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel error={Boolean(bodyError)}>Body</FieldLabel>
            <TiptapExerciseEditor
              value={body}
              disabled={isPending}
              invalid={Boolean(bodyError)}
              onChange={setBody}
            />
            {bodyError ? (
              <p className="text-sm text-destructive">{bodyError}</p>
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
