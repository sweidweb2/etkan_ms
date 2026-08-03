import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";
import type {
  InstructorScheduleSlotPresetColor,
  InstructorScheduleSlotType,
} from "@/types/manager-instructor-schedule";

export const INSTRUCTOR_SCHEDULE_SLOT_TYPE_VALUES = [
  "free",
  "busy",
] as const satisfies readonly InstructorScheduleSlotType[];

export const INSTRUCTOR_SCHEDULE_SLOT_TYPE_LABELS: Record<
  InstructorScheduleSlotType,
  string
> = {
  free: "Free",
  busy: "Busy",
};

export const INSTRUCTOR_SCHEDULE_SLOT_COLORS = [
  "#BAE6FD",
  "#A7F3D0",
  "#DDD6FE",
  "#FDE68A",
  "#FECDD3",
] as const satisfies readonly InstructorScheduleSlotPresetColor[];

export const INSTRUCTOR_SCHEDULE_SLOT_COLOR_LABELS: Record<
  InstructorScheduleSlotPresetColor,
  string
> = {
  "#BAE6FD": "Sky",
  "#A7F3D0": "Emerald",
  "#DDD6FE": "Violet",
  "#FDE68A": "Amber",
  "#FECDD3": "Rose",
};

/** Strong accent for labels / left border against the pastel fill. */
export const INSTRUCTOR_SCHEDULE_SLOT_COLOR_STRONG: Record<
  InstructorScheduleSlotPresetColor,
  string
> = {
  "#BAE6FD": "#0284c7",
  "#A7F3D0": "#059669",
  "#DDD6FE": "#7c3aed",
  "#FDE68A": "#b45309",
  "#FECDD3": "#e11d48",
};

export const INSTRUCTOR_SCHEDULE_SLOT_DEFAULT_COLOR =
  INSTRUCTOR_SCHEDULE_SLOT_COLORS[0];

/** Backend-enforced entity_type for the instructor schedules flow. */
export const ENTITY_SCHEDULE_TYPE_INSTRUCTOR = "instructor" as const;

const hexColorPattern = /^#[0-9A-Fa-f]{6}$/;

function darkenHex(hex: string, amount = 0.45): string {
  const normalized = hex.replace("#", "");
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  const factor = 1 - amount;
  const toHex = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value * factor)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function getInstructorScheduleSlotStrongColor(
  color: string | null | undefined
): string {
  const normalized = (color ?? "").trim();
  const match = INSTRUCTOR_SCHEDULE_SLOT_COLORS.find(
    (preset) => preset.toLowerCase() === normalized.toLowerCase()
  );
  if (match) {
    return INSTRUCTOR_SCHEDULE_SLOT_COLOR_STRONG[match];
  }
  if (hexColorPattern.test(normalized)) {
    return darkenHex(normalized);
  }
  return INSTRUCTOR_SCHEDULE_SLOT_COLOR_STRONG[
    INSTRUCTOR_SCHEDULE_SLOT_DEFAULT_COLOR
  ];
}

export function normalizeInstructorScheduleSlotColor(
  value: string | null | undefined
): string {
  const normalized = (value ?? "").trim();
  if (hexColorPattern.test(normalized)) {
    return `#${normalized.slice(1).toUpperCase()}`;
  }
  return INSTRUCTOR_SCHEDULE_SLOT_DEFAULT_COLOR;
}

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

const instructorScheduleSlotFields = z
  .object({
    record_id: z.string().uuid({ message: "Instructor is required." }),
    name: z
      .string()
      .trim()
      .min(1, { message: "Name is required." })
      .max(120, { message: "Name must be at most 120 characters." }),
    type: z.enum(INSTRUCTOR_SCHEDULE_SLOT_TYPE_VALUES, {
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
    color: z
      .string()
      .trim()
      .regex(hexColorPattern, { message: "Please choose a valid color." }),
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

export const createInstructorScheduleSlotSchema = instructorScheduleSlotFields;

export const updateInstructorScheduleSlotSchema =
  instructorScheduleSlotFields.extend({
    id: z.string().uuid({ message: "Schedule slot id is required." }),
  });

export const instructorScheduleSlotIdSchema = z.object({
  id: z.string().uuid({ message: "Schedule slot id is required." }),
});

export type CreateInstructorScheduleSlotInput = z.infer<
  typeof createInstructorScheduleSlotSchema
>;

export type UpdateInstructorScheduleSlotInput = z.infer<
  typeof updateInstructorScheduleSlotSchema
>;

export type InstructorScheduleSlotIdInput = z.infer<
  typeof instructorScheduleSlotIdSchema
>;

/** Sunday = 0 … Saturday = 6, matching Postgres EXTRACT(DOW). */
export function dayOfWeekFromIsoDate(isoDate: string): number {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function parseCreateInstructorScheduleSlotFormData(formData: FormData):
  | { success: true; data: CreateInstructorScheduleSlotInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = createInstructorScheduleSlotSchema.safeParse({
    record_id: formData.get("record_id"),
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

export function parseUpdateInstructorScheduleSlotFormData(formData: FormData):
  | { success: true; data: UpdateInstructorScheduleSlotInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = updateInstructorScheduleSlotSchema.safeParse({
    id: formData.get("id"),
    record_id: formData.get("record_id"),
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

export function parseInstructorScheduleSlotIdFormData(formData: FormData):
  | { success: true; data: InstructorScheduleSlotIdInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = instructorScheduleSlotIdSchema.safeParse({
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
