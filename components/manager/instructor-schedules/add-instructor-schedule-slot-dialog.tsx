"use client";

import { useMemo, useState } from "react";
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
  currentSundayWeekStartLocal,
  projectInstructorSlotDate,
} from "@/lib/manager/instructor-schedule-calendar";
import {
  createInstructorScheduleSlotSchema,
  ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
  resolveInstructorScheduleSlotType,
  type CreateInstructorScheduleSlotInput,
} from "@/lib/validators/manager/instructor-schedule-slot";
import type {
  ManagerInstructorScheduleTab,
  ScheduleEntityType,
} from "@/types/manager-instructor-schedule";

const WEEKDAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const;

export type AddInstructorScheduleSlotDefaults = {
  record_id?: string;
  start_time?: string;
  end_time?: string;
  /** 0 = Sunday … 6 = Saturday. */
  day_of_week?: number;
};

type AddInstructorScheduleSlotDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (values: CreateInstructorScheduleSlotInput) => void | Promise<void>;
  defaults: AddInstructorScheduleSlotDefaults | null;
  instructors: ManagerInstructorScheduleTab[];
};

function defaultDayOfWeek(defaults: AddInstructorScheduleSlotDefaults | null) {
  if (
    defaults?.day_of_week != null &&
    defaults.day_of_week >= 0 &&
    defaults.day_of_week <= 6
  ) {
    return defaults.day_of_week;
  }
  return new Date().getDay();
}

export function AddInstructorScheduleSlotDialog({
  open,
  onOpenChange,
  onCreate,
  defaults,
  instructors,
}: AddInstructorScheduleSlotDialogProps) {
  const handleOpenChange = usePendingAwareOpenChange(false, onOpenChange);
  const [dayOfWeek, setDayOfWeek] = useState(() => defaultDayOfWeek(defaults));
  const [dayError, setDayError] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(open);

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

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDayOfWeek(defaultDayOfWeek(defaults));
      setDayError(null);
      reset({
        entity_type: ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
        record_id: defaults?.record_id ?? "",
        name: "",
        start_time: defaults?.start_time ?? "09:00",
        end_time: defaults?.end_time ?? "10:30",
      });
    }
  }

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

  const weekdaySelectItems = useMemo(
    () =>
      WEEKDAY_OPTIONS.map((option) => ({
        value: String(option.value),
        label: option.label,
      })),
    []
  );

  const selectedEntityLabel =
    entityOptions.find((option) => option.id === selectedRecordId)?.label ??
    null;

  const selectedDayLabel =
    WEEKDAY_OPTIONS.find((option) => option.value === dayOfWeek)?.label ?? null;

  function onSubmit(values: {
    entity_type: ScheduleEntityType;
    record_id: string;
    name: string;
    start_time: string;
    end_time: string;
    slot_date?: string;
  }) {
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      setDayError("Please select a day.");
      return;
    }

    const payload: CreateInstructorScheduleSlotInput = {
      ...values,
      type: resolveInstructorScheduleSlotType({
        entityType: values.entity_type,
      }),
      slot_date: projectInstructorSlotDate(
        currentSundayWeekStartLocal(),
        dayOfWeek
      ),
    };
    // Close immediately and call onCreate synchronously so the parent's
    // optimistic setSessions paints before the server action settles.
    onOpenChange(false);
    void onCreate(payload);
  }

  const recordIdError = errors.record_id?.message;
  const nameError = errors.name?.message;
  const startTimeError = errors.start_time?.message;
  const endTimeError = errors.end_time?.message;

  const canSubmit =
    Boolean(selectedRecordId) &&
    entityOptions.some((option) => option.id === selectedRecordId) &&
    dayOfWeek >= 0 &&
    dayOfWeek <= 6;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Add schedule slot</DialogTitle>
          <DialogDescription>
            Instructor slots are free availability on the weekly calendar. Pick
            the weekday the slot repeats on.
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
                disabled={entityOptions.length === 0}
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

            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="add-schedule-slot-day"
                label="Day"
                hint="Required"
              />
              <Select
                value={String(dayOfWeek)}
                items={weekdaySelectItems}
                onValueChange={(value) => {
                  if (value == null) return;
                  const next = Number(value);
                  if (Number.isNaN(next) || next < 0 || next > 6) {
                    return;
                  }
                  setDayOfWeek(next);
                  setDayError(null);
                }}
              >
                <SelectTrigger
                  id="add-schedule-slot-day"
                  className="w-full"
                  aria-invalid={Boolean(dayError)}
                >
                  <SelectValue placeholder="Select day">
                    {selectedDayLabel}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {dayError ? (
                <p className="text-sm text-destructive">{dayError}</p>
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
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-instructor-schedule-slot-form"
            disabled={!canSubmit}
          >
            Add slot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
