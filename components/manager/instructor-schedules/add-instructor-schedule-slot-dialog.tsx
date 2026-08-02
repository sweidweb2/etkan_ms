"use client";

import { useEffect, useTransition } from "react";
import { FieldLabel } from "@/components/auth/field-label";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { InstructorScheduleSlotColorPicker } from "@/components/manager/instructor-schedules/instructor-schedule-slot-color-picker";
import { InstructorScheduleSlotTypePicker } from "@/components/manager/instructor-schedules/instructor-schedule-slot-type-picker";
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
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useZodForm } from "@/hooks/use-zod-form";
import {
  createInstructorScheduleSlotSchema,
  INSTRUCTOR_SCHEDULE_SLOT_DEFAULT_COLOR,
  type CreateInstructorScheduleSlotInput,
} from "@/lib/validators/manager/instructor-schedule-slot";
import type { InstructorScheduleSlotType } from "@/types/manager-instructor-schedule";

export type AddInstructorScheduleSlotDefaults = {
  record_id: string;
  slot_date?: string;
  start_time?: string;
  end_time?: string;
  type?: InstructorScheduleSlotType;
};

type AddInstructorScheduleSlotDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (values: CreateInstructorScheduleSlotInput) => void | Promise<void>;
  defaults: AddInstructorScheduleSlotDefaults | null;
  instructorLabel?: string | null;
};

function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function AddInstructorScheduleSlotDialog({
  open,
  onOpenChange,
  onCreate,
  defaults,
  instructorLabel = null,
}: AddInstructorScheduleSlotDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const isPending = isTransitionPending;
  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useZodForm({
    schema: createInstructorScheduleSlotSchema,
    mode: "onBlur",
    defaultValues: {
      record_id: defaults?.record_id ?? "",
      name: "",
      type: defaults?.type ?? "busy",
      slot_date: defaults?.slot_date ?? todayIso(),
      start_time: defaults?.start_time ?? "09:00",
      end_time: defaults?.end_time ?? "10:30",
      color: INSTRUCTOR_SCHEDULE_SLOT_DEFAULT_COLOR,
    },
  });

  const selectedType = watch("type");
  const selectedColor = watch("color");

  useEffect(() => {
    if (open && defaults) {
      reset({
        record_id: defaults.record_id,
        name: "",
        type: defaults.type ?? "busy",
        slot_date: defaults.slot_date ?? todayIso(),
        start_time: defaults.start_time ?? "09:00",
        end_time: defaults.end_time ?? "10:30",
        color: INSTRUCTOR_SCHEDULE_SLOT_DEFAULT_COLOR,
      });
    }
  }, [open, defaults, reset]);

  function onSubmit(values: CreateInstructorScheduleSlotInput) {
    onOpenChange(false);
    startTransition(() => {
      void onCreate(values);
    });
  }

  const nameError = errors.name?.message;
  const typeError = errors.type?.message;
  const slotDateError = errors.slot_date?.message;
  const startTimeError = errors.start_time?.message;
  const endTimeError = errors.end_time?.message;
  const colorError = errors.color?.message;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Add schedule slot</DialogTitle>
          <DialogDescription>
            {instructorLabel
              ? `Create a free/busy slot for ${instructorLabel}.`
              : "Create a free/busy slot for the selected instructor."}
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-instructor-schedule-slot-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <input type="hidden" {...register("record_id")} />
          <input type="hidden" {...register("type")} />
          <input type="hidden" {...register("color")} />

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-instructor-schedule-slot-name"
              label="Name"
              hint="Required"
            />
            <Input
              id="add-instructor-schedule-slot-name"
              aria-invalid={!!nameError}
              disabled={isPending}
              placeholder="e.g. Office hours, Meeting block"
              {...register("name")}
            />
            {nameError ? (
              <p className="text-sm text-destructive">{nameError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-instructor-schedule-slot-type"
              label="Type"
              hint="Required"
            />
            <InstructorScheduleSlotTypePicker
              id="add-instructor-schedule-slot-type"
              value={selectedType}
              disabled={isPending}
              invalid={!!typeError}
              onChange={(type: InstructorScheduleSlotType) => {
                setValue("type", type, { shouldValidate: true });
              }}
            />
            {typeError ? (
              <p className="text-sm text-destructive">{typeError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-instructor-schedule-slot-color"
              label="Color"
              hint="Required"
            />
            <div id="add-instructor-schedule-slot-color">
              <InstructorScheduleSlotColorPicker
                value={selectedColor}
                disabled={isPending}
                invalid={!!colorError}
                onChange={(color: string) => {
                  setValue("color", color, { shouldValidate: true });
                }}
              />
            </div>
            {colorError ? (
              <p className="text-sm text-destructive">{colorError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-instructor-schedule-slot-date"
              label="Date"
              hint="Required"
            />
            <Input
              id="add-instructor-schedule-slot-date"
              type="date"
              aria-invalid={!!slotDateError}
              disabled={isPending}
              {...register("slot_date")}
            />
            {slotDateError ? (
              <p className="text-sm text-destructive">{slotDateError}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="add-instructor-schedule-slot-start"
                label="Start time"
                hint="HH:mm"
              />
              <Input
                id="add-instructor-schedule-slot-start"
                type="time"
                aria-invalid={!!startTimeError}
                disabled={isPending}
                {...register("start_time")}
              />
              {startTimeError ? (
                <p className="text-sm text-destructive">{startTimeError}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="add-instructor-schedule-slot-end"
                label="End time"
                hint="HH:mm"
              />
              <Input
                id="add-instructor-schedule-slot-end"
                type="time"
                aria-invalid={!!endTimeError}
                disabled={isPending}
                {...register("end_time")}
              />
              {endTimeError ? (
                <p className="text-sm text-destructive">{endTimeError}</p>
              ) : null}
            </div>
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
            form="add-instructor-schedule-slot-form"
            disabled={isPending || !defaults?.record_id}
          >
            {isPending ? (
              <>
                <InlineSpinner />
                Creating slot
              </>
            ) : (
              "Add slot"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
