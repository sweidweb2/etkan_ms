"use client";

import { useEffect, useTransition } from "react";
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
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useZodForm } from "@/hooks/use-zod-form";
import {
  createInstructorScheduleSlotSchema,
  ENTITY_SCHEDULE_TYPE_WORKSHOP,
  resolveInstructorScheduleSlotType,
  todayIsoDateLocal,
  type CreateInstructorScheduleSlotFormInput,
  type CreateInstructorScheduleSlotInput,
} from "@/lib/validators/manager/instructor-schedule-slot";

const DEFAULT_START_TIME = "10:00";
const DEFAULT_END_TIME = "12:30";

export function buildWorkshopScheduleSlotName(
  workshopName: string,
  nextSessionNumber: number
): string {
  const trimmed = workshopName.trim() || "this workshop";
  return `Session ${nextSessionNumber} of ${trimmed}`;
}

type AddWorkshopScheduleSlotDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workshopId: string;
  workshopName: string;
  nextSessionNumber: number;
  onCreate: (values: CreateInstructorScheduleSlotInput) => void | Promise<void>;
};

export function AddWorkshopScheduleSlotDialog({
  open,
  onOpenChange,
  workshopId,
  workshopName,
  nextSessionNumber,
  onCreate,
}: AddWorkshopScheduleSlotDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const isPending = isTransitionPending;
  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);
  const autoName = buildWorkshopScheduleSlotName(
    workshopName,
    nextSessionNumber
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useZodForm({
    schema: createInstructorScheduleSlotSchema,
    mode: "onBlur",
    defaultValues: {
      entity_type: ENTITY_SCHEDULE_TYPE_WORKSHOP,
      record_id: workshopId,
      name: autoName,
      start_time: DEFAULT_START_TIME,
      end_time: DEFAULT_END_TIME,
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset({
      entity_type: ENTITY_SCHEDULE_TYPE_WORKSHOP,
      record_id: workshopId,
      name: buildWorkshopScheduleSlotName(workshopName, nextSessionNumber),
      start_time: DEFAULT_START_TIME,
      end_time: DEFAULT_END_TIME,
    });
  }, [open, workshopId, workshopName, nextSessionNumber, reset]);

  function onSubmit(values: CreateInstructorScheduleSlotFormInput) {
    const payload: CreateInstructorScheduleSlotInput = {
      entity_type: ENTITY_SCHEDULE_TYPE_WORKSHOP,
      record_id: workshopId,
      name: buildWorkshopScheduleSlotName(workshopName, nextSessionNumber),
      start_time: values.start_time,
      end_time: values.end_time,
      type: resolveInstructorScheduleSlotType({
        entityType: ENTITY_SCHEDULE_TYPE_WORKSHOP,
      }),
      slot_date: todayIsoDateLocal(),
    };
    onOpenChange(false);
    startTransition(() => {
      void onCreate(payload);
    });
  }

  const startTimeError = errors.start_time?.message;
  const endTimeError = errors.end_time?.message;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Add schedule slot</DialogTitle>
          <DialogDescription>
            Creates a busy workshop slot that mirrors onto assigned instructors.
            Weekday is taken from today&apos;s date.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-workshop-schedule-slot-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <input type="hidden" {...register("entity_type")} />
          <input type="hidden" {...register("record_id")} />
          <input type="hidden" {...register("name")} />

          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
            <p className="text-muted-foreground">
              Entity{" "}
              <span className="font-medium text-foreground">Workshop</span>
            </p>
            <p className="mt-1 text-muted-foreground">
              Workshop{" "}
              <span className="font-medium text-foreground">
                {workshopName.trim() || "—"}
              </span>
            </p>
            <p className="mt-1 text-muted-foreground">
              Name{" "}
              <span className="font-medium text-foreground">{autoName}</span>
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="add-workshop-schedule-slot-start"
                label="Start time"
                hint="HH:mm"
              />
              <Input
                id="add-workshop-schedule-slot-start"
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
                htmlFor="add-workshop-schedule-slot-end"
                label="End time"
                hint="HH:mm"
              />
              <Input
                id="add-workshop-schedule-slot-end"
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
            form="add-workshop-schedule-slot-form"
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
