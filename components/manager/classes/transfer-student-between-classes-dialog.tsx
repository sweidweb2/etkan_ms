"use client";

import { useActionState, useEffect, useTransition } from "react";
import { transferStudentBetweenClassesAction } from "@/app/manager/classes/actions";
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
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useZodForm } from "@/hooks/use-zod-form";
import {
  transferStudentBetweenClassesSchema,
  type TransferStudentBetweenClassesInput,
} from "@/lib/validators/manager/transfer-student-between-classes";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";
import type { TransferStudentBetweenClassesActionState } from "@/types/manager-class-detail";

const initialState: TransferStudentBetweenClassesActionState = {};

export type ClassTransferOption = {
  id: string;
  name: string;
};

type TransferStudentBetweenClassesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromClassId: string;
  student: ManagerClassStudentRow | null;
  classOptions: ClassTransferOption[];
  onTransferred: () => void;
};

export function TransferStudentBetweenClassesDialog({
  open,
  onOpenChange,
  fromClassId,
  student,
  classOptions,
  onTransferred,
}: TransferStudentBetweenClassesDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    transferStudentBetweenClassesAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;
  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  useActionStateToast(state, isPending);

  const destinationOptions = classOptions.filter(
    (option) => option.id !== fromClassId
  );

  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useZodForm({
    schema: transferStudentBetweenClassesSchema,
    mode: "onBlur",
    defaultValues: {
      student_profile_id: student?.student_profile_id ?? "",
      from_class_id: fromClassId,
      to_class_id: "",
    },
  });

  const selectedToClassId = watch("to_class_id");

  useEffect(() => {
    if (open && student) {
      reset({
        student_profile_id: student.student_profile_id,
        from_class_id: fromClassId,
        to_class_id: "",
      });
    }
  }, [open, student, fromClassId, reset]);

  useActionStateSuccess(state, isPending, () => {
    onOpenChange(false);
    onTransferred();
  });

  function onSubmit(values: TransferStudentBetweenClassesInput) {
    if (!student) return;
    const formData = new FormData();
    formData.set("student_profile_id", student.student_profile_id);
    formData.set("from_class_id", fromClassId);
    formData.set("to_class_id", values.to_class_id);
    startTransition(() => formAction(formData));
  }

  const toClassError =
    errors.to_class_id?.message ?? state.fieldErrors?.to_class_id?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Transfer student</DialogTitle>
          <DialogDescription>
            Move {student?.full_name ?? "this student"} to another class. Source
            billing is cancelled; destination payment phase is not auto-assigned.
          </DialogDescription>
        </DialogHeader>

        <form
          id="transfer-student-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="transfer-to-class"
              label="Destination class"
              hint="Required"
            />
            <Select
              value={selectedToClassId || undefined}
              onValueChange={(value) => {
                if (!value) return;
                setValue("to_class_id", value, { shouldValidate: true });
              }}
              disabled={isPending || !student}
            >
              <SelectTrigger
                id="transfer-to-class"
                aria-invalid={!!toClassError}
              >
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {destinationOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {toClassError ? (
              <p className="text-sm text-destructive">{toClassError}</p>
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
          <Button
            type="submit"
            form="transfer-student-form"
            disabled={isPending || !student || destinationOptions.length === 0}
          >
            {isPending ? <InlineSpinner /> : null}
            Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
