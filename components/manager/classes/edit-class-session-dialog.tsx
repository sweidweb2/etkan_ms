"use client";

import { useActionState, useEffect, useTransition } from "react";
import { updateClassSessionAction } from "@/app/manager/classes/actions";
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
  updateClassSessionSchema,
  type UpdateClassSessionInput,
} from "@/lib/validators/manager/update-class-session";
import type { UpdateClassSessionActionState } from "@/types/manager-class-session-detail";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";

const initialState: UpdateClassSessionActionState = {};

type EditClassSessionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: ManagerClassSessionRow;
  classId: string;
  className: string;
  onSessionUpdated: (session: ManagerClassSessionRow) => void;
};

function toDatetimeLocalValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function EditClassSessionDialog({
  open,
  onOpenChange,
  session,
  classId,
  className,
  onSessionUpdated,
}: EditClassSessionDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateClassSessionAction,
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
    schema: updateClassSessionSchema,
    mode: "onBlur",
    defaultValues: {
      topic: session.topic,
      starts_at: toDatetimeLocalValue(session.starts_at),
      ends_at: toDatetimeLocalValue(session.ends_at),
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset({
      topic: session.topic,
      starts_at: toDatetimeLocalValue(session.starts_at),
      ends_at: toDatetimeLocalValue(session.ends_at),
    });
  }, [open, reset, session]);

  useActionStateSuccess(
    state,
    isPending,
    (nextState) => {
      if (!nextState.session) {
        return;
      }

      onSessionUpdated(nextState.session);
      onOpenChange(false);
    },
    (nextState) => Boolean(nextState.success && nextState.session)
  );

  function onSubmit(values: UpdateClassSessionInput) {
    const formData = new FormData();
    formData.set("class_id", classId);
    formData.set("session_id", session.id);
    formData.set("topic", values.topic);
    formData.set("starts_at", values.starts_at);
    formData.set("ends_at", values.ends_at);

    startTransition(() => {
      formAction(formData);
    });
  }

  const topicError = errors.topic?.message ?? state.fieldErrors?.topic?.[0];
  const startsError =
    errors.starts_at?.message ?? state.fieldErrors?.starts_at?.[0];
  const endsError = errors.ends_at?.message ?? state.fieldErrors?.ends_at?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Edit session</DialogTitle>
          <DialogDescription>
            Update S{session.nb_order} for {className}.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-class-session-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-class-session-topic"
              label="Topic"
              hint="Required"
            />
            <Input
              id="edit-class-session-topic"
              aria-invalid={!!topicError}
              disabled={isPending}
              {...register("topic")}
            />
            {topicError ? (
              <p className="text-sm text-destructive">{topicError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-class-session-starts-at"
              label="Starts at"
              hint="Required"
            />
            <Input
              id="edit-class-session-starts-at"
              type="datetime-local"
              aria-invalid={!!startsError}
              disabled={isPending}
              {...register("starts_at")}
            />
            {startsError ? (
              <p className="text-sm text-destructive">{startsError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-class-session-ends-at"
              label="Ends at"
              hint="Required"
            />
            <Input
              id="edit-class-session-ends-at"
              type="datetime-local"
              aria-invalid={!!endsError}
              disabled={isPending}
              {...register("ends_at")}
            />
            {endsError ? (
              <p className="text-sm text-destructive">{endsError}</p>
            ) : null}
          </div>
        </form>

        <DialogFooter className="mt-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isPending} onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-class-session-form"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <InlineSpinner className="mr-2" />
                Saving
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
