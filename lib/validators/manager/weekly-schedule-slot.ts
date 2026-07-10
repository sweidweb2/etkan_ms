import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";
import type { WeeklyScheduleDay } from "@/types/manager-weekly-schedule";

export const WEEKLY_SCHEDULE_DAY_VALUES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const satisfies readonly WeeklyScheduleDay[];

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

const weeklyScheduleSlotFields = z
  .object({
    class_id: z.string().uuid({ message: "Class is required." }),
    day: z.enum(WEEKLY_SCHEDULE_DAY_VALUES, {
      message: "Day is required.",
    }),
    start_time: z
      .string()
      .trim()
      .regex(timePattern, { message: "Start time must use HH:mm format." }),
    end_time: z
      .string()
      .trim()
      .regex(timePattern, { message: "End time must use HH:mm format." }),
    room: z
      .string()
      .trim()
      .min(1, { message: "Room is required." })
      .max(120, { message: "Room must be at most 120 characters." }),
  })
  .superRefine((values, context) => {
    if (timeToMinutes(values.end_time) <= timeToMinutes(values.start_time)) {
      context.addIssue({
        code: "custom",
        message: "End time must be after start time.",
        path: ["end_time"],
      });
    }
  });

export const createWeeklyScheduleSlotSchema = weeklyScheduleSlotFields;

export const updateWeeklyScheduleSlotSchema = weeklyScheduleSlotFields.extend({
  id: z.string().uuid({ message: "Schedule slot id is required." }),
});

export const weeklyScheduleSlotIdSchema = z.object({
  id: z.string().uuid({ message: "Schedule slot id is required." }),
});

export type CreateWeeklyScheduleSlotInput = z.infer<
  typeof createWeeklyScheduleSlotSchema
>;

export type UpdateWeeklyScheduleSlotInput = z.infer<
  typeof updateWeeklyScheduleSlotSchema
>;

export type WeeklyScheduleSlotIdInput = z.infer<typeof weeklyScheduleSlotIdSchema>;

export function parseCreateWeeklyScheduleSlotFormData(formData: FormData):
  | { success: true; data: CreateWeeklyScheduleSlotInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = createWeeklyScheduleSlotSchema.safeParse({
    class_id: formData.get("class_id"),
    day: formData.get("day"),
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
    room: formData.get("room"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  return { success: true, data: parsed.data };
}

export function parseUpdateWeeklyScheduleSlotFormData(formData: FormData):
  | { success: true; data: UpdateWeeklyScheduleSlotInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = updateWeeklyScheduleSlotSchema.safeParse({
    id: formData.get("id"),
    class_id: formData.get("class_id"),
    day: formData.get("day"),
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
    room: formData.get("room"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  return { success: true, data: parsed.data };
}

export function parseWeeklyScheduleSlotIdFormData(formData: FormData):
  | { success: true; data: WeeklyScheduleSlotIdInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = weeklyScheduleSlotIdSchema.safeParse({
    id: formData.get("id"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  return { success: true, data: parsed.data };
}

export { timeToMinutes };
