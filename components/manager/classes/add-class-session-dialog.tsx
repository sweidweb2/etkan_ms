"use client";

import { useActionState, useEffect, useTransition } from "react";
import { createClassSessionAction } from "@/app/manager/classes/actions";
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
  createClassSessionSchema,
  type CreateClassSessionInput,
} from "@/lib/validators/manager/create-class-session";
import { toDateTimeLocalValue } from "@/lib/utils/datetime-local-value";
import type { CreateClassSessionActionState } from "@/types/manager-class-detail";
import type { ManagerClassRow } from "@/types/manager-class-list";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";

const initialState: CreateClassSessionActionState = {};

type AddClassSessionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  className: string;
  nextNbOrder: number;
  onSessionCreated: (
    session: ManagerClassSessionRow,
    classRow: ManagerClassRow
  ) => void;
};

export function AddClassSessionDialog({
  open,
  onOpenChange,
  classId,
  className,
  nextNbOrder,
  onSessionCreated,
}: AddClassSessionDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    createClassSessionAction,
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
    schema: createClassSessionSchema,
    mode: "onBlur",
    defaultValues: {
      topic: "",
      starts_at: "",
      ends_at: "",
    },
  });

  useEffect(() => {
    if (!open) {
      reset({
        topic: "",
        starts_at: "",
        ends_at: "",
      });
      return;
    }

    const startsAt = new Date();
    const endsAt = new Date(startsAt);
    endsAt.setDate(endsAt.getDate() + 7);

    reset({
      topic: `Session ${nextNbOrder}`,
      starts_at: toDateTimeLocalValue(startsAt),
      ends_at: toDateTimeLocalValue(endsAt),
    });
  }, [nextNbOrder, open, reset]);

  useActionStateSuccess(
    state,
    isPending,
    (nextState) => {
      if (!nextState.session || !nextState.classRow) {
        return;
      }

      onSessionCreated(nextState.session, nextState.classRow);
      onOpenChange(false);
    },
    (nextState) =>
      Boolean(nextState.success && nextState.session && nextState.classRow)
  );

  function onSubmit(values: CreateClassSessionInput) {
    const formData = new FormData();
    formData.set("class_id", classId);
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
          <DialogTitle>Add session</DialogTitle>
          <DialogDescription>
            Schedule session {nextNbOrder} for {className}.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-class-session-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-class-session-topic"
              label="Topic"
              hint="Required"
            />
            <Input
              id="add-class-session-topic"
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
              htmlFor="add-class-session-starts-at"
              label="Starts at"
              hint="Required"
            />
            <Input
              id="add-class-session-starts-at"
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
              htmlFor="add-class-session-ends-at"
              label="Ends at"
              hint="Required"
            />
            <Input
              id="add-class-session-ends-at"
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
            disabled={isPending}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form="add-class-session-form" disabled={isPending}>
            {isPending ? (
              <>
                <InlineSpinner className="mr-2" />
                Creating session
              </>
            ) : (
              "Create session"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
