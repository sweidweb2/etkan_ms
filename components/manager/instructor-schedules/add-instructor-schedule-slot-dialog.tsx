"use client";

import { useEffect, useMemo, useTransition } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useZodForm } from "@/hooks/use-zod-form";
import {
  createInstructorScheduleSlotSchema,
  ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
  ENTITY_SCHEDULE_TYPE_LABELS,
  ENTITY_SCHEDULE_TYPE_VALUES,
  ENTITY_SCHEDULE_TYPE_WORKSHOP,
  INSTRUCTOR_SCHEDULE_SLOT_DEFAULT_COLOR,
  type CreateInstructorScheduleSlotInput,
} from "@/lib/validators/manager/instructor-schedule-slot";
import type {
  InstructorScheduleSlotType,
  ManagerInstructorScheduleTab,
  ManagerScheduleWorkshopTab,
  ScheduleEntityType,
} from "@/types/manager-instructor-schedule";

export type AddInstructorScheduleSlotDefaults = {
  entity_type?: ScheduleEntityType;
  record_id?: string;
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
  instructors: ManagerInstructorScheduleTab[];
  eligibleWorkshops: ManagerScheduleWorkshopTab[];
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
  instructors,
  eligibleWorkshops,
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
      entity_type: defaults?.entity_type ?? ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
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
  const selectedEntityType = watch("entity_type");
  const selectedRecordId = watch("record_id");

  const entityOptions = useMemo(() => {
    if (selectedEntityType === ENTITY_SCHEDULE_TYPE_WORKSHOP) {
      return eligibleWorkshops.map((workshop) => ({
        id: workshop.id,
        label: workshop.name,
      }));
    }

    return instructors.map((instructor) => ({
      id: instructor.id,
      label: instructor.username?.trim() || "Unknown",
    }));
  }, [eligibleWorkshops, instructors, selectedEntityType]);

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

    const nextEntityType =
      defaults?.entity_type ?? ENTITY_SCHEDULE_TYPE_INSTRUCTOR;
    const nextRecordId = defaults?.record_id ?? "";

    reset({
      entity_type: nextEntityType,
      record_id: nextRecordId,
      name: "",
      type: defaults?.type ?? "busy",
      slot_date: defaults?.slot_date ?? todayIso(),
      start_time: defaults?.start_time ?? "09:00",
      end_time: defaults?.end_time ?? "10:30",
      color: INSTRUCTOR_SCHEDULE_SLOT_DEFAULT_COLOR,
    });
  }, [open, defaults, reset]);

  function onSubmit(values: CreateInstructorScheduleSlotInput) {
    onOpenChange(false);
    startTransition(() => {
      void onCreate(values);
    });
  }

  const entityTypeError = errors.entity_type?.message;
  const recordIdError = errors.record_id?.message;
  const nameError = errors.name?.message;
  const typeError = errors.type?.message;
  const slotDateError = errors.slot_date?.message;
  const startTimeError = errors.start_time?.message;
  const endTimeError = errors.end_time?.message;
  const colorError = errors.color?.message;

  const canSubmit =
    Boolean(selectedEntityType) &&
    Boolean(selectedRecordId) &&
    entityOptions.some((option) => option.id === selectedRecordId);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Add schedule slot</DialogTitle>
          <DialogDescription>
            Create a weekly free/busy slot for an instructor or workshop.
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
          <input type="hidden" {...register("type")} />
          <input type="hidden" {...register("color")} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="add-schedule-slot-entity-type"
                label="Entity"
                hint="Required"
              />
              <Select
                value={selectedEntityType}
                onValueChange={(value) => {
                  if (!value) return;
                  const nextType = value as ScheduleEntityType;
                  setValue("entity_type", nextType, { shouldValidate: true });
                  setValue("record_id", "", { shouldValidate: true });
                }}
                disabled={isPending}
              >
                <SelectTrigger
                  id="add-schedule-slot-entity-type"
                  className="w-full"
                  aria-invalid={Boolean(entityTypeError)}
                >
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_SCHEDULE_TYPE_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {ENTITY_SCHEDULE_TYPE_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {entityTypeError ? (
                <p className="text-sm text-destructive">{entityTypeError}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="add-schedule-slot-record-id"
                label={
                  selectedEntityType === ENTITY_SCHEDULE_TYPE_WORKSHOP
                    ? "Workshop"
                    : "Instructor"
                }
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
                  <SelectValue
                    placeholder={
                      selectedEntityType === ENTITY_SCHEDULE_TYPE_WORKSHOP
                        ? "Select workshop"
                        : "Select instructor"
                    }
                  >
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
                  {selectedEntityType === ENTITY_SCHEDULE_TYPE_WORKSHOP
                    ? "No eligible workshops (need open end date or future end, and not completed/cancelled)."
                    : "No instructors available."}
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
              label="Anchor date"
              hint="Sets weekday · repeats weekly"
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
            <p className="text-xs text-muted-foreground">
              Remembers when the slot was created and which weekday it repeats
              on. Workshop slots also respect the workshop start/end dates.
            </p>
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
