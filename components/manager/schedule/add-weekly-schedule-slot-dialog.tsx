"use client";

import { useActionState, useEffect, useTransition } from "react";
import { createWeeklyScheduleSlotAction } from "@/app/manager/schedule/actions";
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
import { Input } from "@/components/ui/input";
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
  createWeeklyScheduleSlotSchema,
  WEEKLY_SCHEDULE_DAY_VALUES,
  type CreateWeeklyScheduleSlotInput,
} from "@/lib/validators/manager/weekly-schedule-slot";
import type {
  CreateWeeklyScheduleSlotActionState,
  ManagerWeeklyScheduleClassOption,
} from "@/types/manager-weekly-schedule";

const initialState: CreateWeeklyScheduleSlotActionState = {};

type AddWeeklyScheduleSlotDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classOptions: ManagerWeeklyScheduleClassOption[];
  onSlotCreated: () => void;
};

export function AddWeeklyScheduleSlotDialog({
  open,
  onOpenChange,
  classOptions,
  onSlotCreated,
}: AddWeeklyScheduleSlotDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    createWeeklyScheduleSlotAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;

  useActionStateToast(state, isPending);

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
      class_id: "",
      day: "Monday",
      start_time: "09:00",
      end_time: "10:30",
      room: "",
    },
  });

  const selectedClassId = watch("class_id");
  const selectedDay = watch("day");

  useEffect(() => {
    if (!open) {
      reset({
        class_id: "",
        day: "Monday",
        start_time: "09:00",
        end_time: "10:30",
        room: "",
      });
    }
  }, [open, reset]);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    onOpenChange(false);
    onSlotCreated();
  }, [state.success, onOpenChange, onSlotCreated]);

  function onSubmit(values: CreateWeeklyScheduleSlotInput) {
    const formData = new FormData();
    formData.set("class_id", values.class_id);
    formData.set("day", values.day);
    formData.set("start_time", values.start_time);
    formData.set("end_time", values.end_time);
    formData.set("room", values.room.trim());

    startTransition(() => {
      formAction(formData);
    });
  }

  const classIdError =
    errors.class_id?.message ?? state.fieldErrors?.class_id?.[0];
  const dayError = errors.day?.message ?? state.fieldErrors?.day?.[0];
  const startTimeError =
    errors.start_time?.message ?? state.fieldErrors?.start_time?.[0];
  const endTimeError =
    errors.end_time?.message ?? state.fieldErrors?.end_time?.[0];
  const roomError = errors.room?.message ?? state.fieldErrors?.room?.[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add schedule slot</DialogTitle>
          <DialogDescription>
            Create a recurring weekly class slot on the timetable.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-schedule-slot-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <input type="hidden" {...register("class_id")} />
          <input type="hidden" {...register("day")} />

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-schedule-slot-class"
              label="Class"
              hint="Required"
            />
            <Select
              value={selectedClassId || undefined}
              disabled={isPending}
              onValueChange={(value) => {
                if (!value) {
                  return;
                }

                setValue("class_id", value, { shouldValidate: true });
              }}
            >
              <SelectTrigger
                id="add-schedule-slot-class"
                className="w-full"
                aria-invalid={!!classIdError}
              >
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {classIdError ? (
              <p className="text-sm text-destructive">{classIdError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-schedule-slot-day"
              label="Day"
              hint="Required"
            />
            <Select
              value={selectedDay}
              disabled={isPending}
              onValueChange={(value) => {
                if (!value) {
                  return;
                }

                setValue("day", value as CreateWeeklyScheduleSlotInput["day"], {
                  shouldValidate: true,
                });
              }}
            >
              <SelectTrigger
                id="add-schedule-slot-day"
                className="w-full"
                aria-invalid={!!dayError}
              >
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {WEEKLY_SCHEDULE_DAY_VALUES.map((day) => (
                  <SelectItem key={day} value={day}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {dayError ? (
              <p className="text-sm text-destructive">{dayError}</p>
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

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-schedule-slot-room"
              label="Room"
              hint="Required"
            />
            <Input
              id="add-schedule-slot-room"
              aria-invalid={!!roomError}
              disabled={isPending}
              {...register("room")}
            />
            {roomError ? (
              <p className="text-sm text-destructive">{roomError}</p>
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
            form="add-schedule-slot-form"
            disabled={isPending || classOptions.length === 0}
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
