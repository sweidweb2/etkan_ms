"use client";

import { useActionState, useEffect, useTransition } from "react";
import { createMentorSubjectAction } from "@/app/manager/instructors/actions";
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
  CreateMentorSubjectActionState,
  ManagerMentorSubjectColumn,
} from "@/types/manager-instructor";

const initialState: CreateMentorSubjectActionState = {};

type AddMentorSubjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (subject: ManagerMentorSubjectColumn) => void;
};

export function AddMentorSubjectDialog({
  open,
  onOpenChange,
  onCreated,
}: AddMentorSubjectDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    createMentorSubjectAction,
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
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (!open) {
      reset({ name: "" });
    }
  }, [open, reset]);

  useActionStateSuccess(state, isPending, (nextState) => {
    onOpenChange(false);
    if (nextState.mentorSubject) {
      onCreated(nextState.mentorSubject);
    }
  });

  function onSubmit(values: CreateMentorSubjectInput) {
    const formData = new FormData();
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
          <DialogTitle>Add mentor subject</DialogTitle>
          <DialogDescription>
            Create a mentor subject for the instructor capability matrix.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <FieldLabel
              htmlFor="mentor-subject-name"
              label="Name"
              hint="Required"
            />
            <Input
              id="mentor-subject-name"
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
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
