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
import { showSuccessToast } from "@/lib/toast";
import {
  connectSemesterClassSchema,
  type ConnectSemesterClassInput,
} from "@/lib/validators/manager/connect-semester-class";
import type { ManagerSemesterClassRow } from "@/types/manager-semester-class";

type ConnectSemesterClassDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  semesterName: string;
  availableClasses: ManagerSemesterClassRow[];
  onConnectClass: (classRow: ManagerSemesterClassRow) => void;
};

export function ConnectSemesterClassDialog({
  open,
  onOpenChange,
  semesterName,
  availableClasses,
  onConnectClass,
}: ConnectSemesterClassDialogProps) {
  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<ConnectSemesterClassInput>({
    resolver: zodResolver(connectSemesterClassSchema),
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

  function onSubmit(values: ConnectSemesterClassInput) {
    const classRow = availableClasses.find((row) => row.id === values.classId);

    if (!classRow) {
      setError("classId", { message: "This class is no longer available." });
      return;
    }

    onConnectClass({
      ...classRow,
      semester_id: classRow.semester_id,
    });
    showSuccessToast(`${classRow.name} connected to ${semesterName}.`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect class</DialogTitle>
          <DialogDescription>
            Link a class that is not assigned to another semester to{" "}
            {semesterName}. Preview-only until backend is connected.
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
              >
                <SelectTrigger
                  id="connect-semester-class-id"
                  className="w-full"
                  aria-invalid={!!errors.classId}
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
                No unlinked classes are available in the preview.
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
            form="connect-semester-class-form"
            disabled={!hasAvailableClasses}
          >
            Connect class
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
