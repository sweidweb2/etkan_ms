"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ManagerClassOption } from "@/types/manager-class";
import {
  assignStudentClassSchema,
  type AssignStudentClassInput,
} from "@/lib/validators/manager/assign-student-class";

type AssignStudentClassDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableClasses: ManagerClassOption[];
  onAssignClass: (classId: string) => void;
};

export function AssignStudentClassDialog({
  open,
  onOpenChange,
  availableClasses,
  onAssignClass,
}: AssignStudentClassDialogProps) {
  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<AssignStudentClassInput>({
    resolver: zodResolver(assignStudentClassSchema),
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

  function onSubmit(values: AssignStudentClassInput) {
    const isAlreadyListed = !availableClasses.some(
      (item) => item.class_id === values.classId
    );

    if (isAlreadyListed) {
      setError("classId", { message: "This class is no longer available." });
      return;
    }

    onAssignClass(values.classId);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign class</DialogTitle>
          <DialogDescription>
            Enroll this student via student_class. Only the class is selected
            here — status and joined date will be set by the backend.
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
              hint="Required · maps to student_class.class_id"
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
              >
                <SelectTrigger
                  id="assign-student-class-id"
                  className="w-full"
                  aria-invalid={!!errors.classId}
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
                This student is already enrolled in every available class.
              </p>
            )}
            {errors.classId ? (
              <p className="text-sm text-destructive">{errors.classId.message}</p>
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
          <Button
            type="submit"
            form="assign-student-class-form"
            disabled={!hasAvailableClasses}
          >
            Assign class
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
