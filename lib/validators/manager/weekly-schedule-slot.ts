import { z } from "zod";
import {
  SCHEDULE_SLOT_DURATION_LIMITS,
  SCHEDULE_SLOT_FIELD_LIMITS,
} from "@/lib/constants/workshop-field-limits";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";
import type {
  WeeklyScheduleSlotColor,
  WeeklyScheduleSlotType,
} from "@/types/manager-weekly-schedule";

export const WEEKLY_SCHEDULE_SLOT_TYPE_VALUES = [
  "class",
  "workshop",
  "online",
  "meeting",
] as const satisfies readonly WeeklyScheduleSlotType[];

export const WEEKLY_SCHEDULE_SLOT_TYPE_LABELS: Record<
  WeeklyScheduleSlotType,
  string
> = {
  class: "Class",
  workshop: "Workshop",
  online: "Online",
  meeting: "Meeting",
};

export const WEEKLY_SCHEDULE_SLOT_COLORS = [
  "#BAE6FD",
  "#A7F3D0",
  "#DDD6FE",
  "#FDE68A",
  "#FECDD3",
] as const satisfies readonly WeeklyScheduleSlotColor[];

export const WEEKLY_SCHEDULE_SLOT_COLOR_LABELS: Record<
  WeeklyScheduleSlotColor,
  string
> = {
  "#BAE6FD": "Sky",
  "#A7F3D0": "Emerald",
  "#DDD6FE": "Violet",
  "#FDE68A": "Amber",
  "#FECDD3": "Rose",
};

/** Strong accent for labels / left border against the pastel fill. */
export const WEEKLY_SCHEDULE_SLOT_COLOR_STRONG: Record<
  WeeklyScheduleSlotColor,
  string
> = {
  "#BAE6FD": "#0284c7",
  "#A7F3D0": "#059669",
  "#DDD6FE": "#7c3aed",
  "#FDE68A": "#b45309",
  "#FECDD3": "#e11d48",
};

export const WEEKLY_SCHEDULE_SLOT_DEFAULT_COLOR =
  WEEKLY_SCHEDULE_SLOT_COLORS[0];

export function getWeeklyScheduleSlotStrongColor(
  pastel: string | null | undefined
): string {
  const normalized = (pastel ?? "").trim().toLowerCase();
  const match = WEEKLY_SCHEDULE_SLOT_COLORS.find(
    (color) => color.toLowerCase() === normalized
  );
  if (!match) {
    return WEEKLY_SCHEDULE_SLOT_COLOR_STRONG[WEEKLY_SCHEDULE_SLOT_DEFAULT_COLOR];
  }
  return WEEKLY_SCHEDULE_SLOT_COLOR_STRONG[match];
}

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

const weeklyScheduleSlotFields = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { message: "Name is required." })
      .max(SCHEDULE_SLOT_FIELD_LIMITS.name.max, {
        message: `Name must be at most ${SCHEDULE_SLOT_FIELD_LIMITS.name.max} characters.`,
      }),
    type: z.enum(WEEKLY_SCHEDULE_SLOT_TYPE_VALUES, {
      message: "Type is required.",
    }),
    slot_date: z
      .string()
      .trim()
      .regex(datePattern, { message: "Date must use YYYY-MM-DD format." }),
    start_time: z
      .string()
      .trim()
      .regex(timePattern, { message: "Start time must use HH:mm format." }),
    end_time: z
      .string()
      .trim()
      .regex(timePattern, { message: "End time must use HH:mm format." }),
    color: z.enum(WEEKLY_SCHEDULE_SLOT_COLORS, {
      message: "Please choose a color.",
    }),
  })
  .superRefine((values, context) => {
    const startMinutes = timeToMinutes(values.start_time);
    const endMinutes = timeToMinutes(values.end_time);
    if (endMinutes <= startMinutes) {
      context.addIssue({
        code: "custom",
        message: "End time must be after start time.",
        path: ["end_time"],
      });
      return;
    }

    const durationMinutes = endMinutes - startMinutes;
    if (durationMinutes < SCHEDULE_SLOT_DURATION_LIMITS.minMinutes) {
      context.addIssue({
        code: "custom",
        message: `Slot must be at least ${SCHEDULE_SLOT_DURATION_LIMITS.minMinutes} minutes.`,
        path: ["end_time"],
      });
    }
    if (durationMinutes > SCHEDULE_SLOT_DURATION_LIMITS.maxMinutes) {
      context.addIssue({
        code: "custom",
        message: `Slot must be under 24 hours (max ${SCHEDULE_SLOT_DURATION_LIMITS.maxMinutes} minutes).`,
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

export const copyWeeklyScheduleSlotsSchema = z.object({
  week_start: z
    .string()
    .trim()
    .regex(datePattern, { message: "Week start must use YYYY-MM-DD format." }),
});

export type CreateWeeklyScheduleSlotInput = z.infer<
  typeof createWeeklyScheduleSlotSchema
>;

export type UpdateWeeklyScheduleSlotInput = z.infer<
  typeof updateWeeklyScheduleSlotSchema
>;

export type WeeklyScheduleSlotIdInput = z.infer<typeof weeklyScheduleSlotIdSchema>;

export type CopyWeeklyScheduleSlotsInput = z.infer<
  typeof copyWeeklyScheduleSlotsSchema
>;

export function parseCreateWeeklyScheduleSlotFormData(formData: FormData):
  | { success: true; data: CreateWeeklyScheduleSlotInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = createWeeklyScheduleSlotSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    slot_date: formData.get("slot_date"),
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
    color: formData.get("color"),
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
    name: formData.get("name"),
    type: formData.get("type"),
    slot_date: formData.get("slot_date"),
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
    color: formData.get("color"),
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

export function parseCopyWeeklyScheduleSlotsFormData(formData: FormData):
  | { success: true; data: CopyWeeklyScheduleSlotsInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = copyWeeklyScheduleSlotsSchema.safeParse({
    week_start: formData.get("week_start"),
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
