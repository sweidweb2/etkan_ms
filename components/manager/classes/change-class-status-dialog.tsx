"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import {
  CLASS_STATUS_VALUES,
  type ClassStatusValue,
} from "@/lib/constants/manager-class-status";
import { MANAGER_CLASS_STATUS_LABELS } from "@/lib/constants/manager-class-display";
import { showSuccessToast } from "@/lib/toast";
import type { ManagerClassRow } from "@/types/manager-class-list";

const changeClassStatusSchema = z.object({
  status: z.enum(CLASS_STATUS_VALUES, {
    message: "Status is required.",
  }),
});

type ChangeClassStatusInput = z.infer<typeof changeClassStatusSchema>;

type ChangeClassStatusDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classRow: ManagerClassRow | null;
  onStatusChange: (status: ClassStatusValue) => void;
};

export function ChangeClassStatusDialog({
  open,
  onOpenChange,
  classRow,
  onStatusChange,
}: ChangeClassStatusDialogProps) {
  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ChangeClassStatusInput>({
    resolver: zodResolver(changeClassStatusSchema),
    defaultValues: {
      status: "scheduled",
    },
  });

  const selectedStatus = watch("status");

  useEffect(() => {
    if (!open || !classRow) {
      return;
    }

    reset({
      status: classRow.status,
    });
  }, [classRow, open, reset]);

  function onSubmit(values: ChangeClassStatusInput) {
    if (!classRow) {
      return;
    }

    onStatusChange(values.status);
    showSuccessToast(
      `${classRow.name} is now ${MANAGER_CLASS_STATUS_LABELS[values.status].toLowerCase()}.`
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change class status</DialogTitle>
          <DialogDescription>
            Update the lifecycle status for {classRow?.name ?? "this class"}.
            Preview-only until backend is connected.
          </DialogDescription>
        </DialogHeader>

        <form
          id="change-class-status-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="change-class-status"
              label="Status"
              hint="Required"
            />
            <Select
              value={selectedStatus || null}
              onValueChange={(value) => {
                if (!value) {
                  return;
                }

                setValue("status", value as ChangeClassStatusInput["status"], {
                  shouldValidate: true,
                });
              }}
            >
              <SelectTrigger
                id="change-class-status"
                className="w-full"
                aria-invalid={!!errors.status}
              >
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent align="start">
                {CLASS_STATUS_VALUES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {MANAGER_CLASS_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.status ? (
              <p className="text-sm text-destructive">{errors.status.message}</p>
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
          <Button type="submit" form="change-class-status-form" disabled={!classRow}>
            Save status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
