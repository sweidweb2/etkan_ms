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
  createPhaseSchema,
  type CreatePhaseInput,
} from "@/lib/validators/manager/create-phase";
import type { ManagerSemesterRow } from "@/types/manager-phase";

type AddPhaseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreatePhase: (phase: ManagerSemesterRow) => void;
};

export function AddPhaseDialog({
  open,
  onOpenChange,
  onCreatePhase,
}: AddPhaseDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useZodForm({
    schema: createPhaseSchema,
    mode: "onBlur",
    defaultValues: {
      name: "",
      nb_courses: 0,
      amount: 0,
    },
  });

  useEffect(() => {
    if (!open) {
      reset({
        name: "",
        nb_courses: 0,
        amount: 0,
      });
    }
  }, [open, reset]);

  function onSubmit(values: CreatePhaseInput) {
    onCreatePhase({
      id: crypto.randomUUID(),
      name: values.name.trim(),
      nb_courses: values.nb_courses,
      amount: values.amount,
      created_at: new Date().toISOString(),
    });

    showSuccessToast("Semester added to the preview list.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add semester</DialogTitle>
          <DialogDescription>
            Create a semester preview with name, number of courses, and amount.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-semester-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <FieldLabel htmlFor="add-semester-name" label="Name" hint="Required" />
              <Input
                id="add-semester-name"
                aria-invalid={!!errors.name}
                {...register("name")}
              />
              {errors.name ? (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="add-semester-courses"
                label="Number of courses"
                hint="Required"
              />
              <Input
                id="add-semester-courses"
                type="number"
                min="0"
                aria-invalid={!!errors.nb_courses}
                {...register("nb_courses")}
              />
              {errors.nb_courses ? (
                <p className="text-sm text-destructive">
                  {errors.nb_courses.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="add-semester-amount"
                label="Amount"
                hint="Required"
              />
              <Input
                id="add-semester-amount"
                type="number"
                min="0"
                step="0.01"
                aria-invalid={!!errors.amount}
                {...register("amount")}
              />
              {errors.amount ? (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              ) : null}
            </div>

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
          <Button type="submit" form="add-semester-form">
            Create semester
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
