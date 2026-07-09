"use client";

import { useEffect } from "react";
import { useZodForm } from "@/hooks/use-zod-form";
import { FieldLabel } from "@/components/auth/field-label";
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
import { showSuccessToast } from "@/lib/toast";
import {
  createClassSessionSchema,
  type CreateClassSessionInput,
} from "@/lib/validators/manager/create-class-session";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";

type AddClassSessionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  className: string;
  nextNbOrder: number;
  onCreateSession: (session: ManagerClassSessionRow) => void;
};

function toDatetimeLocalValue(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function AddClassSessionDialog({
  open,
  onOpenChange,
  classId,
  className,
  nextNbOrder,
  onCreateSession,
}: AddClassSessionDialogProps) {
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
    endsAt.setMinutes(endsAt.getMinutes() + 90);

    reset({
      topic: `Session ${nextNbOrder}`,
      starts_at: toDatetimeLocalValue(startsAt),
      ends_at: toDatetimeLocalValue(endsAt),
    });
  }, [nextNbOrder, open, reset]);

  function onSubmit(values: CreateClassSessionInput) {
    const startsAt = new Date(values.starts_at);
    const endsAt = new Date(values.ends_at);

    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      return;
    }

    onCreateSession({
      id: `${classId}-session-${nextNbOrder}`,
      class_id: classId,
      nb_order: nextNbOrder,
      topic: values.topic.trim(),
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      semester_id: null,
      group_grade_level: null,
      created_at: new Date().toISOString(),
    });

    showSuccessToast(`Session added to ${className}.`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add session</DialogTitle>
          <DialogDescription>
            Schedule session {nextNbOrder} for {className}. Preview-only until
            backend is connected.
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
              aria-invalid={!!errors.topic}
              {...register("topic")}
            />
            {errors.topic ? (
              <p className="text-sm text-destructive">{errors.topic.message}</p>
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
              aria-invalid={!!errors.starts_at}
              {...register("starts_at")}
            />
            {errors.starts_at ? (
              <p className="text-sm text-destructive">{errors.starts_at.message}</p>
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
              aria-invalid={!!errors.ends_at}
              {...register("ends_at")}
            />
            {errors.ends_at ? (
              <p className="text-sm text-destructive">{errors.ends_at.message}</p>
            ) : null}
          </div>
        </form>

        <DialogFooter className="mt-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form="add-class-session-form">
            Create session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
