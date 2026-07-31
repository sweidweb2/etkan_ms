"use client";

import { useEffect, useTransition } from "react";
import { FieldLabel } from "@/components/auth/field-label";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { ScheduleSlotColorPicker } from "@/components/manager/schedule/schedule-slot-color-picker";
import { ScheduleSlotTypePicker } from "@/components/manager/schedule/schedule-slot-type-picker";
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
  createWeeklyScheduleSlotSchema,
  WEEKLY_SCHEDULE_SLOT_DEFAULT_COLOR,
  type CreateWeeklyScheduleSlotInput,
} from "@/lib/validators/manager/weekly-schedule-slot";
import type {
  WeeklyScheduleSlotColor,
  WeeklyScheduleSlotType,
} from "@/types/manager-weekly-schedule";

export type AddWeeklyScheduleSlotDefaults = {
  slot_date?: string;
  start_time?: string;
  end_time?: string;
  type?: WeeklyScheduleSlotType;
};

type AddWeeklyScheduleSlotDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (values: CreateWeeklyScheduleSlotInput) => void | Promise<void>;
  defaults?: AddWeeklyScheduleSlotDefaults | null;
};

function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function AddWeeklyScheduleSlotDialog({
  open,
  onOpenChange,
  onCreate,
  defaults = null,
}: AddWeeklyScheduleSlotDialogProps) {
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
    schema: createWeeklyScheduleSlotSchema,
    mode: "onBlur",
    defaultValues: {
      name: "",
      type: defaults?.type ?? "class",
      slot_date: defaults?.slot_date ?? todayIso(),
      start_time: defaults?.start_time ?? "09:00",
      end_time: defaults?.end_time ?? "10:30",
      color: WEEKLY_SCHEDULE_SLOT_DEFAULT_COLOR,
    },
  });

  const selectedType = watch("type");
  const selectedColor = watch("color");

  useEffect(() => {
    if (open) {
      reset({
        name: "",
        type: defaults?.type ?? "class",
        slot_date: defaults?.slot_date ?? todayIso(),
        start_time: defaults?.start_time ?? "09:00",
        end_time: defaults?.end_time ?? "10:30",
        color: WEEKLY_SCHEDULE_SLOT_DEFAULT_COLOR,
      });
      return;
    }

    reset({
      name: "",
      type: "class",
      slot_date: todayIso(),
      start_time: "09:00",
      end_time: "10:30",
      color: WEEKLY_SCHEDULE_SLOT_DEFAULT_COLOR,
    });
  }, [open, defaults, reset]);

  function onSubmit(values: CreateWeeklyScheduleSlotInput) {
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
            Create a schedule slot on a specific calendar date.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-schedule-slot-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <input type="hidden" {...register("type")} />
          <input type="hidden" {...register("color")} />

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-schedule-slot-name"
              label="Name"
              hint="Required"
            />
            <Input
              id="add-schedule-slot-name"
              aria-invalid={!!nameError}
              disabled={isPending}
              placeholder="e.g. Algebra A, Team standup"
              {...register("name")}
            />
            {nameError ? (
              <p className="text-sm text-destructive">{nameError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-schedule-slot-type"
              label="Type"
              hint="Required"
            />
            <ScheduleSlotTypePicker
              id="add-schedule-slot-type"
              value={selectedType}
              disabled={isPending}
              invalid={!!typeError}
              onChange={(type: WeeklyScheduleSlotType) => {
                setValue("type", type, { shouldValidate: true });
              }}
            />
            {typeError ? (
              <p className="text-sm text-destructive">{typeError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-schedule-slot-color"
              label="Color"
              hint="Required"
            />
            <div id="add-schedule-slot-color">
              <ScheduleSlotColorPicker
                value={selectedColor}
                disabled={isPending}
                invalid={!!colorError}
                onChange={(color: WeeklyScheduleSlotColor) => {
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
              htmlFor="add-schedule-slot-date"
              label="Date"
              hint="Required"
            />
            <Input
              id="add-schedule-slot-date"
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
                htmlFor="add-schedule-slot-start"
                label="Start time"
                hint="HH:mm"
              />
              <Input
                id="add-schedule-slot-start"
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
                htmlFor="add-schedule-slot-end"
                label="End time"
                hint="HH:mm"
              />
              <Input
                id="add-schedule-slot-end"
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
            form="add-schedule-slot-form"
            disabled={isPending}
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
