"use client";

import { useEffect, useTransition } from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import { updateSubjectAction } from "@/app/manager/instructors/actions";
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
  SUBJECT_SCOPE_COPY,
  type SubjectScope,
} from "@/lib/constants/subject-scope";
import {
  createCapabilitySubjectSchema,
  type CreateCapabilitySubjectInput,
} from "@/lib/validators/manager/create-capability-subject";
import type {
  ManagerSubjectColumn,
  UpdateSubjectActionState,
} from "@/types/manager-capability-subject";

const initialState: UpdateSubjectActionState = {};

type EditSubjectDialogProps = {
  scope: SubjectScope;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: ManagerSubjectColumn;
  onUpdated: (subject: ManagerSubjectColumn) => void;
};

export function EditSubjectDialog({
  scope,
  open,
  onOpenChange,
  subject,
  onUpdated,
}: EditSubjectDialogProps) {
  const copy = SUBJECT_SCOPE_COPY[scope];
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateSubjectAction,
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
    schema: createCapabilitySubjectSchema,
    mode: "onBlur",
    defaultValues: { name: subject.name },
  });

  useEffect(() => {
    if (open) {
      reset({ name: subject.name });
    }
  }, [open, reset, subject]);

  useActionStateSuccess(state, isPending, (nextState) => {
    if (nextState.subject) {
      onUpdated(nextState.subject);
    }
    onOpenChange(false);
  });

  function onSubmit(values: CreateCapabilitySubjectInput) {
    const formData = new FormData();
    formData.set("scope", scope);
    formData.set("id", subject.id);
    formData.set("name", values.name.trim());
    startTransition(() => {
      formAction(formData);
    });
  }

  const nameError = errors.name?.message ?? state.fieldErrors?.name?.[0];
  const inputId = `edit-${scope}-subject-name`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Edit {copy.subjectSingularLower}</DialogTitle>
          <DialogDescription>
            Rename this {copy.subjectSingularLower}. Capability checkboxes stay
            linked by id.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <FieldLabel htmlFor={inputId} label="Name" hint="Required" />
            <Input
              id={inputId}
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
