"use client";

import { useActionState, useEffect, useTransition } from "react";
import { updateMentorSubjectAction } from "@/app/manager/instructors/actions";
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
  createMentorSubjectSchema,
  type CreateMentorSubjectInput,
} from "@/lib/validators/manager/create-mentor-subject";
import type {
  ManagerMentorSubjectColumn,
  UpdateMentorSubjectActionState,
} from "@/types/manager-instructor";

const initialState: UpdateMentorSubjectActionState = {};

type EditMentorSubjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: ManagerMentorSubjectColumn;
  onUpdated: (subject: ManagerMentorSubjectColumn) => void;
};

export function EditMentorSubjectDialog({
  open,
  onOpenChange,
  subject,
  onUpdated,
}: EditMentorSubjectDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateMentorSubjectAction,
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
    schema: createMentorSubjectSchema,
    mode: "onBlur",
    defaultValues: { name: subject.name },
  });

  useEffect(() => {
    if (open) {
      reset({ name: subject.name });
    }
  }, [open, reset, subject]);

  useActionStateSuccess(state, isPending, (nextState) => {
    if (nextState.mentorSubject) {
      onUpdated(nextState.mentorSubject);
    }
    onOpenChange(false);
  });

  function onSubmit(values: CreateMentorSubjectInput) {
    const formData = new FormData();
    formData.set("id", subject.id);
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
          <DialogTitle>Edit mentor subject</DialogTitle>
          <DialogDescription>
            Rename this mentor subject. Capability checkboxes stay linked by id.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <FieldLabel
              htmlFor="edit-mentor-subject-name"
              label="Name"
              hint="Required"
            />
            <Input
              id="edit-mentor-subject-name"
              autoComplete="off"
              disabled={isPending}
              aria-invalid={Boolean(nameError)}
              {...register("name")}
            />
            {nameError ? (
              <p className="text-sm text-destructive">{nameError}</p>
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
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
