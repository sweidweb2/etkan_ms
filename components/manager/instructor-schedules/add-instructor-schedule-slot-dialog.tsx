"use client";

import { useEffect, useMemo, useTransition } from "react";
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
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useZodForm } from "@/hooks/use-zod-form";
import { SCHEDULE_SLOT_FIELD_LIMITS } from "@/lib/constants/workshop-field-limits";
import {
  createInstructorScheduleSlotSchema,
  ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
  resolveInstructorScheduleSlotType,
  todayIsoDateLocal,
  type CreateInstructorScheduleSlotInput,
} from "@/lib/validators/manager/instructor-schedule-slot";
import type {
  ManagerInstructorScheduleTab,
  ScheduleEntityType,
} from "@/types/manager-instructor-schedule";

export type AddInstructorScheduleSlotDefaults = {
  record_id?: string;
  start_time?: string;
  end_time?: string;
};

type AddInstructorScheduleSlotDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (values: CreateInstructorScheduleSlotInput) => void | Promise<void>;
  defaults: AddInstructorScheduleSlotDefaults | null;
  instructors: ManagerInstructorScheduleTab[];
};

export function AddInstructorScheduleSlotDialog({
  open,
  onOpenChange,
  onCreate,
  defaults,
  instructors,
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
      entity_type: ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
      record_id: defaults?.record_id ?? "",
      name: "",
      start_time: defaults?.start_time ?? "09:00",
      end_time: defaults?.end_time ?? "10:30",
    },
  });

  const selectedRecordId = watch("record_id");

  const entityOptions = useMemo(
    () =>
      instructors.map((instructor) => ({
        id: instructor.id,
        label: instructor.username?.trim() || "Unknown",
      })),
    [instructors]
  );

  const entitySelectItems = useMemo(
    () =>
      entityOptions.map((option) => ({
        value: option.id,
        label: option.label,
      })),
    [entityOptions]
  );

  const selectedEntityLabel =
    entityOptions.find((option) => option.id === selectedRecordId)?.label ??
    null;

  useEffect(() => {
    if (!open) {
      return;
    }

    reset({
      entity_type: ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
      record_id: defaults?.record_id ?? "",
      name: "",
      start_time: defaults?.start_time ?? "09:00",
      end_time: defaults?.end_time ?? "10:30",
    });
  }, [open, defaults, reset]);

  function onSubmit(values: {
    entity_type: ScheduleEntityType;
    record_id: string;
    name: string;
    start_time: string;
    end_time: string;
    slot_date?: string;
  }) {
    const payload: CreateInstructorScheduleSlotInput = {
      ...values,
      type: resolveInstructorScheduleSlotType({
        entityType: values.entity_type,
      }),
      // Anchor date is always "now" for form creates (weekday from today).
      slot_date: todayIsoDateLocal(),
    };
    onOpenChange(false);
    startTransition(() => {
      void onCreate(payload);
    });
  }

  const recordIdError = errors.record_id?.message;
  const nameError = errors.name?.message;
  const startTimeError = errors.start_time?.message;
  const endTimeError = errors.end_time?.message;

  const canSubmit =
    Boolean(selectedRecordId) &&
    entityOptions.some((option) => option.id === selectedRecordId);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Add schedule slot</DialogTitle>
          <DialogDescription>
            Instructor slots are free availability on the weekly calendar.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-instructor-schedule-slot-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <input type="hidden" {...register("entity_type")} />
          <input type="hidden" {...register("record_id")} />

          <div className="grid gap-4">
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="add-schedule-slot-record-id"
                label="Instructor"
                hint="Required"
              />
              <Select
                value={selectedRecordId || null}
                items={entitySelectItems}
                onValueChange={(value) => {
                  if (!value) return;
                  setValue("record_id", value, { shouldValidate: true });
                }}
                disabled={isPending || entityOptions.length === 0}
              >
                <SelectTrigger
                  id="add-schedule-slot-record-id"
                  className="w-full"
                  aria-invalid={Boolean(recordIdError)}
                >
                  <SelectValue placeholder="Select instructor">
                    {selectedEntityLabel}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {entityOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {recordIdError ? (
                <p className="text-sm text-destructive">{recordIdError}</p>
              ) : null}
              {entityOptions.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No instructors available.
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-instructor-schedule-slot-name"
              label="Name"
              hint="Required"
            />
            <Input
              id="add-instructor-schedule-slot-name"
              maxLength={SCHEDULE_SLOT_FIELD_LIMITS.name.max}
              aria-invalid={!!nameError}
              disabled={isPending}
              placeholder="e.g. Office hours, Meeting block"
              {...register("name")}
            />
            {nameError ? (
              <p className="text-sm text-destructive">{nameError}</p>
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
            disabled={isPending || !canSubmit}
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
