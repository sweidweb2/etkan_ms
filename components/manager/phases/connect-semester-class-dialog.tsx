"use client";

import { useActionState, useEffect, useTransition } from "react";
import { connectClassToSemesterAction } from "@/app/manager/phases/actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { useZodForm } from "@/hooks/use-zod-form";
import {
  connectSemesterClassSchema,
  type ConnectSemesterClassInput,
} from "@/lib/validators/manager/connect-semester-class";
import type { ConnectSemesterClassActionState } from "@/types/manager-phase";
import type { ManagerSemesterClassRow } from "@/types/manager-semester-class";

const initialState: ConnectSemesterClassActionState = {};

type ConnectSemesterClassDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  semesterId: string;
  semesterName: string;
  availableClasses: ManagerSemesterClassRow[];
  onClassConnected: () => void;
};

export function ConnectSemesterClassDialog({
  open,
  onOpenChange,
  semesterId,
  semesterName,
  availableClasses,
  onClassConnected,
}: ConnectSemesterClassDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    connectClassToSemesterAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;

  useActionStateToast(state, isPending);

  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useZodForm({
    schema: connectSemesterClassSchema,
    mode: "onBlur",
    defaultValues: {
      classId: "",
    },
  });

  const selectedClassId = watch("classId");
  const hasAvailableClasses = availableClasses.length > 0;

  useEffect(() => {
    if (!open) {
      reset({ classId: "" });
    }
  }, [open, reset]);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    onOpenChange(false);
    onClassConnected();
  }, [state.success, onOpenChange, onClassConnected]);

  function onSubmit(values: ConnectSemesterClassInput) {
    const formData = new FormData();
    formData.set("semester_id", semesterId);
    formData.set("classId", values.classId);

    startTransition(() => {
      formAction(formData);
    });
  }

  const classError = errors.classId?.message ?? state.fieldErrors?.classId?.[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect class</DialogTitle>
          <DialogDescription>
            Link a class that is not assigned to another semester to{" "}
            {semesterName}.
          </DialogDescription>
        </DialogHeader>

        <form
          id="connect-semester-class-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="connect-semester-class-id"
              label="Class"
              hint="Required · unlinked classes only"
            />
            {hasAvailableClasses ? (
              <Select
                value={selectedClassId || null}
                onValueChange={(value) => {
                  if (!value) {
                    return;
                  }

                  setValue("classId", value, { shouldValidate: true });
                }}
                disabled={isPending}
              >
                <SelectTrigger
                  id="connect-semester-class-id"
                  className="w-full"
                  aria-invalid={!!classError}
                >
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent align="start">
                  {availableClasses.map((classRow) => (
                    <SelectItem key={classRow.id} value={classRow.id}>
                      {classRow.name} · {classRow.subject_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">
                No unlinked classes are available.
              </p>
            )}
            {classError ? (
              <p className="text-sm text-destructive">{classError}</p>
            ) : null}
          </div>
        </form>

        <DialogFooter className="mt-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="connect-semester-class-form"
            disabled={!hasAvailableClasses || isPending}
          >
            {isPending ? <InlineSpinner /> : "Connect class"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
