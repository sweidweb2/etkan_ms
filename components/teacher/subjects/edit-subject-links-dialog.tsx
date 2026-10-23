"use client";

import { useEffect, useTransition } from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import { updateSubjectLinksAction } from "@/app/teacher/subjects/actions";
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
import { updateSubjectLinksSchema } from "@/lib/validators/teacher/update-subject-links";
import { cn } from "@/lib/utils";
import type { TeacherSubjectRow } from "@/types/teacher-class";
import type { UpdateSubjectLinksActionState } from "@/types/teacher-subject";

const initialState: UpdateSubjectLinksActionState = {};

type EditSubjectLinksDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: TeacherSubjectRow;
  onSubjectUpdated: (subject: TeacherSubjectRow) => void;
};

export function EditSubjectLinksDialog({
  open,
  onOpenChange,
  subject,
  onSubjectUpdated,
}: EditSubjectLinksDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateSubjectLinksAction,
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
    schema: updateSubjectLinksSchema,
    mode: "onBlur",
    defaultValues: {
      syllabus_link: subject.syllabus_link ?? "",
      reference_link: subject.reference_link ?? "",
      handout_link: subject.handout_link ?? "",
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    reset({
      syllabus_link: subject.syllabus_link ?? "",
      reference_link: subject.reference_link ?? "",
      handout_link: subject.handout_link ?? "",
    });
  }, [open, reset, subject]);

  useActionStateSuccess(state, isPending, (nextState) => {
    if (nextState.subject) {
      onSubjectUpdated(nextState.subject);
    }
    handleOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={!isPending} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit syllabus links</DialogTitle>
          <DialogDescription>
            Update links for {subject.name}. Name and session count stay
            unchanged.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((values) => {
            const formData = new FormData();
            formData.set("id", subject.id);
            formData.set("syllabus_link", values.syllabus_link ?? "");
            formData.set("reference_link", values.reference_link ?? "");
            formData.set("handout_link", values.handout_link ?? "");
            startTransition(() => {
              formAction(formData);
            });
          })}
        >
          <div className="space-y-2">
            <FieldLabel htmlFor="syllabus_link">Syllabus link</FieldLabel>
            <Input
              id="syllabus_link"
              type="url"
              placeholder="https://"
              disabled={isPending}
              aria-invalid={Boolean(
                errors.syllabus_link || state.fieldErrors?.syllabus_link
              )}
              className={cn(
                (errors.syllabus_link || state.fieldErrors?.syllabus_link) &&
                  "border-destructive"
              )}
              {...register("syllabus_link")}
            />
            <p className="text-sm text-destructive">
              {errors.syllabus_link?.message ??
                state.fieldErrors?.syllabus_link?.[0]}
            </p>
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="reference_link">Reference link</FieldLabel>
            <Input
              id="reference_link"
              type="url"
              placeholder="https://"
              disabled={isPending}
              aria-invalid={Boolean(
                errors.reference_link || state.fieldErrors?.reference_link
              )}
              className={cn(
                (errors.reference_link || state.fieldErrors?.reference_link) &&
                  "border-destructive"
              )}
              {...register("reference_link")}
            />
            <p className="text-sm text-destructive">
              {errors.reference_link?.message ??
                state.fieldErrors?.reference_link?.[0]}
            </p>
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="handout_link">Handout link</FieldLabel>
            <Input
              id="handout_link"
              type="url"
              placeholder="https://"
              disabled={isPending}
              aria-invalid={Boolean(
                errors.handout_link || state.fieldErrors?.handout_link
              )}
              className={cn(
                (errors.handout_link || state.fieldErrors?.handout_link) &&
                  "border-destructive"
              )}
              {...register("handout_link")}
            />
            <p className="text-sm text-destructive">
              {errors.handout_link?.message ??
                state.fieldErrors?.handout_link?.[0]}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <InlineSpinner /> : null}
              Save links
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
