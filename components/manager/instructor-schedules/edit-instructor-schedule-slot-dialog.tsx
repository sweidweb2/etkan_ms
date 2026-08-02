"use client";

import { useEffect, useTransition } from "react";
import { Trash2Icon } from "lucide-react";
import { Can } from "@/components/auth/can";
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
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  updateInstructorScheduleSlotSchema,
  INSTRUCTOR_SCHEDULE_SLOT_DEFAULT_COLOR,
  type UpdateInstructorScheduleSlotInput,
} from "@/lib/validators/manager/instructor-schedule-slot";
import type {
  InstructorScheduleSlotType,
  ManagerInstructorScheduleSession,
} from "@/types/manager-instructor-schedule";

type EditInstructorScheduleSlotDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: ManagerInstructorScheduleSession | null;
  onUpdate: (values: UpdateInstructorScheduleSlotInput) => void | Promise<void>;
  onDeleteRequest?: (session: ManagerInstructorScheduleSession) => void;
};

export function EditInstructorScheduleSlotDialog({
  open,
  onOpenChange,
  session,
  onUpdate,
  onDeleteRequest,
}: EditInstructorScheduleSlotDialogProps) {
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
    schema: updateInstructorScheduleSlotSchema,
    mode: "onBlur",
    defaultValues: {
      id: session?.id ?? "",
      record_id: session?.recordId ?? "",
      name: session?.name ?? "",
      type: session?.type ?? "busy",
      slot_date: session?.slotDate ?? "",
      start_time: session?.startTime ?? "09:00",
      end_time: session?.endTime ?? "10:30",
      color: session?.color ?? INSTRUCTOR_SCHEDULE_SLOT_DEFAULT_COLOR,
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
      record_id: session.recordId,
      name: session.name,
      type: session.type,
      slot_date: session.slotDate,
      start_time: session.startTime,
      end_time: session.endTime,
      color: session.color || INSTRUCTOR_SCHEDULE_SLOT_DEFAULT_COLOR,
    });
  }, [open, reset, session]);

  function onSubmit(values: UpdateInstructorScheduleSlotInput) {
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
            Update the instructor schedule slot details.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-instructor-schedule-slot-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <input type="hidden" {...register("id")} />
          <input type="hidden" {...register("record_id")} />
          <input type="hidden" {...register("type")} />
          <input type="hidden" {...register("color")} />

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-instructor-schedule-slot-name"
              label="Name"
              hint="Required"
            />
            <Input
              id="edit-instructor-schedule-slot-name"
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
              htmlFor="edit-instructor-schedule-slot-type"
              label="Type"
              hint="Required"
            />
            <InstructorScheduleSlotTypePicker
              id="edit-instructor-schedule-slot-type"
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
              htmlFor="edit-instructor-schedule-slot-color"
              label="Color"
              hint="Required"
            />
            <div id="edit-instructor-schedule-slot-color">
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
              htmlFor="edit-instructor-schedule-slot-date"
              label="Date"
              hint="Required"
            />
            <Input
              id="edit-instructor-schedule-slot-date"
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
                htmlFor="edit-instructor-schedule-slot-start"
                label="Start time"
                hint="HH:mm"
              />
              <Input
                id="edit-instructor-schedule-slot-start"
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
                htmlFor="edit-instructor-schedule-slot-end"
                label="End time"
                hint="HH:mm"
              />
              <Input
                id="edit-instructor-schedule-slot-end"
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
            <Can permission={PERMISSIONS.INSTRUCTOR_SCHEDULES_DELETE}>
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
              form="edit-instructor-schedule-slot-form"
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
