"use client";

import { useEffect, useTransition } from "react";
import { Trash2Icon } from "lucide-react";
import { Can } from "@/components/auth/can";
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
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  updateWeeklyScheduleSlotSchema,
  WEEKLY_SCHEDULE_SLOT_DEFAULT_COLOR,
  type UpdateWeeklyScheduleSlotInput,
} from "@/lib/validators/manager/weekly-schedule-slot";
import type {
  ManagerWeeklyScheduleSession,
  WeeklyScheduleSlotColor,
  WeeklyScheduleSlotType,
} from "@/types/manager-weekly-schedule";

type EditWeeklyScheduleSlotDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: ManagerWeeklyScheduleSession | null;
  onUpdate: (values: UpdateWeeklyScheduleSlotInput) => void | Promise<void>;
  onDeleteRequest?: (session: ManagerWeeklyScheduleSession) => void;
};

export function EditWeeklyScheduleSlotDialog({
  open,
  onOpenChange,
  session,
  onUpdate,
  onDeleteRequest,
}: EditWeeklyScheduleSlotDialogProps) {
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
    schema: updateWeeklyScheduleSlotSchema,
    mode: "onBlur",
    defaultValues: {
      id: session?.id ?? "",
      name: session?.name ?? "",
      type: session?.type ?? "class",
      slot_date: session?.slotDate ?? "",
      start_time: session?.startTime ?? "09:00",
      end_time: session?.endTime ?? "10:30",
      color:
        (session?.color as WeeklyScheduleSlotColor | undefined) ??
        WEEKLY_SCHEDULE_SLOT_DEFAULT_COLOR,
    },
  });

  const selectedType = watch("type");
  const selectedColor = watch("color");

  useEffect(() => {
    if (!open || !session) {
      return;
    }

    reset({
      id: session.id,
      name: session.name,
      type: session.type,
      slot_date: session.slotDate,
      start_time: session.startTime,
      end_time: session.endTime,
      color:
        (session.color as WeeklyScheduleSlotColor | undefined) ??
        WEEKLY_SCHEDULE_SLOT_DEFAULT_COLOR,
    });
  }, [open, reset, session]);

  function onSubmit(values: UpdateWeeklyScheduleSlotInput) {
    onOpenChange(false);
    startTransition(() => {
      void onUpdate(values);
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
          <DialogTitle>Edit schedule slot</DialogTitle>
          <DialogDescription>
            Update the schedule slot details.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-schedule-slot-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <input type="hidden" {...register("id")} />
          <input type="hidden" {...register("type")} />
          <input type="hidden" {...register("color")} />

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-schedule-slot-name"
              label="Name"
              hint="Required"
            />
            <Input
              id="edit-schedule-slot-name"
              aria-invalid={!!nameError}
              disabled={isPending}
              {...register("name")}
            />
            {nameError ? (
              <p className="text-sm text-destructive">{nameError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-schedule-slot-type"
              label="Type"
              hint="Required"
            />
            <ScheduleSlotTypePicker
              id="edit-schedule-slot-type"
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
              htmlFor="edit-schedule-slot-color"
              label="Color"
              hint="Required"
            />
            <div id="edit-schedule-slot-color">
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
              htmlFor="edit-schedule-slot-date"
              label="Date"
              hint="Required"
            />
            <Input
              id="edit-schedule-slot-date"
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
                htmlFor="edit-schedule-slot-start"
                label="Start time"
                hint="HH:mm"
              />
              <Input
                id="edit-schedule-slot-start"
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
                htmlFor="edit-schedule-slot-end"
                label="End time"
                hint="HH:mm"
              />
              <Input
                id="edit-schedule-slot-end"
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

        <DialogFooter className="mt-2 sm:justify-between">
          {session && onDeleteRequest ? (
            <Can permission={PERMISSIONS.SCHEDULE_DELETE}>
              <Button
                type="button"
                variant="destructive"
                size="icon-sm"
                disabled={isPending}
                aria-label="Delete schedule slot"
                onClick={() => onDeleteRequest(session)}
              >
                <Trash2Icon />
              </Button>
            </Can>
          ) : (
            <span />
          )}
          <div className="flex flex-wrap items-center justify-end gap-2">
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
              form="edit-schedule-slot-form"
              disabled={!session || isPending}
            >
              {isPending ? (
                <>
                  <InlineSpinner />
                  Saving changes
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
