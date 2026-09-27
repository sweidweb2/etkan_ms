"use client";

import { useEffect, useState, useTransition } from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import { addStudentToClassAction } from "@/app/manager/classes/actions";
import { FieldLabel } from "@/components/auth/field-label";
import {
  OptionalEnrollPaymentPhasesDialog,
  type OptionalEnrollPaymentPhaseOption,
} from "@/components/manager/classes/optional-enroll-payment-phases-dialog";
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
  assignStudentClassSchema,
  type AssignStudentClassInput,
} from "@/lib/validators/manager/assign-student-class";
import type { ManagerClassOption } from "@/types/manager-class";
import type { AddStudentToClassActionState } from "@/types/manager-class-detail";

const initialState: AddStudentToClassActionState = {};

type OptionalEnrollFollowUp = {
  studentId: string;
  studentLabel: string;
  autoAssignedPhase: OptionalEnrollPaymentPhaseOption;
  optionalPaymentPhases: OptionalEnrollPaymentPhaseOption[];
};

type AssignStudentClassDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentProfileId: string;
  availableClasses: ManagerClassOption[];
  onAssigned: () => void;
};

export function AssignStudentClassDialog({
  open,
  onOpenChange,
  studentProfileId,
  availableClasses,
  onAssigned,
}: AssignStudentClassDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    addStudentToClassAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;
  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);
  const [optionalFollowUp, setOptionalFollowUp] =
    useState<OptionalEnrollFollowUp | null>(null);

  useActionStateToast(state, isPending);

  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useZodForm({
    schema: assignStudentClassSchema,
    mode: "onBlur",
    defaultValues: {
      classId: "",
    },
  });

  const selectedClassId = watch("classId");
  const hasAvailableClasses = availableClasses.length > 0;

  useEffect(() => {
    if (open) {
      reset({ classId: "" });
    }
  }, [open, reset]);

  useActionStateSuccess(state, isPending, (nextState) => {
    onOpenChange(false);
    onAssigned();

    const student = nextState.student ?? nextState.students?.[0];
    if (
      student &&
      nextState.autoAssignedPhase &&
      nextState.optionalPaymentPhases &&
      nextState.optionalPaymentPhases.length > 0
    ) {
      setOptionalFollowUp({
        studentId: student.user_id,
        studentLabel: student.full_name,
        autoAssignedPhase: nextState.autoAssignedPhase,
        optionalPaymentPhases: nextState.optionalPaymentPhases,
      });
    }
  });

  function onSubmit(values: AssignStudentClassInput) {
    const isStillAvailable = availableClasses.some(
      (item) => item.class_id === values.classId
    );

    if (!isStillAvailable) {
      setError("classId", { message: "This class is no longer available." });
      return;
    }

    const formData = new FormData();
    formData.set("class_id", values.classId);
    formData.append("studentProfileIds", studentProfileId);

    startTransition(() => {
      formAction(formData);
    });
  }

  const classError =
    errors.classId?.message ?? state.fieldErrors?.studentProfileIds?.[0];

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
          <DialogHeader>
            <DialogTitle>Assign class</DialogTitle>
            <DialogDescription>
              Add this student as a member of the selected class. Billing sync
              runs for the class semester when applicable.
            </DialogDescription>
          </DialogHeader>

          <form
            id="assign-student-class-form"
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="assign-student-class-id"
                label="Class"
                hint="Required"
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
                    id="assign-student-class-id"
                    className="w-full"
                    aria-invalid={!!classError}
                  >
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClasses.map((classOption) => (
                      <SelectItem
                        key={classOption.class_id}
                        value={classOption.class_id}
                      >
                        {classOption.name} · {classOption.subject_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
                  This student is already a member of every available class.
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
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="assign-student-class-form"
              disabled={!hasAvailableClasses || isPending}
            >
              {isPending ? (
                <>
                  <InlineSpinner />
                  Assigning
                </>
              ) : (
                "Assign class"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OptionalEnrollPaymentPhasesDialog
        open={optionalFollowUp !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setOptionalFollowUp(null);
          }
        }}
        studentId={optionalFollowUp?.studentId ?? ""}
        studentLabel={optionalFollowUp?.studentLabel ?? ""}
        autoAssignedPhase={
          optionalFollowUp?.autoAssignedPhase ?? { id: "", name: "" }
        }
        optionalPaymentPhases={optionalFollowUp?.optionalPaymentPhases ?? []}
      />
    </>
  );
}
