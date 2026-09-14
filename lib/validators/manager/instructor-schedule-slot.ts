import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";
import {
  SCHEDULE_SLOT_DURATION_LIMITS,
  SCHEDULE_SLOT_FIELD_LIMITS,
} from "@/lib/constants/workshop-field-limits";
import type {
  InstructorScheduleSlotPresetColor,
  InstructorScheduleSlotType,
  ScheduleEntityType,
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

export const ENTITY_SCHEDULE_TYPE_INSTRUCTOR = "instructor" as const;
export const ENTITY_SCHEDULE_TYPE_WORKSHOP = "workshop" as const;

export const ENTITY_SCHEDULE_TYPE_VALUES = [
  ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
  ENTITY_SCHEDULE_TYPE_WORKSHOP,
] as const satisfies readonly ScheduleEntityType[];

export const ENTITY_SCHEDULE_TYPE_LABELS: Record<ScheduleEntityType, string> = {
  instructor: "Instructor",
  workshop: "Workshop",
};

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

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const s = saturation / 100;
  const l = lightness / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (hue < 60) {
    r = c;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = c;
  } else if (hue < 180) {
    g = c;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = c;
  } else if (hue < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const toHex = (channel: number) =>
    clampByte((channel + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Disjoint hue bands so All-view categories never collide:
 * - instructor free slots → cool blues/cyans
 * - workshop entity slots → greens/ambers
 * - instructor slots mirrored from workshops → violets/roses
 */
const DISPLAY_COLOR_BANDS = {
  instructor: { start: 185, span: 55 },
  workshop: { start: 55, span: 70 },
  mirror: { start: 285, span: 70 },
} as const;

type DisplayColorCategory = keyof typeof DISPLAY_COLOR_BANDS;

function hashToCategoryColor(category: DisplayColorCategory, id: string): string {
  const hash = hashSeed(`${category}:${id}`);
  const band = DISPLAY_COLOR_BANDS[category];
  const hue = band.start + (hash % band.span);
  const saturation = 58 + (hash % 18);
  const lightness = 78 + ((hash >>> 8) % 8);
  return hslToHex(hue, saturation, lightness);
}

/**
 * Display-only pastel color (categories use disjoint palettes):
 * - instructor (no workshop link) → stable per instructor
 * - workshop entity → stable per workshop
 * - instructor mirrored from a workshop → stable per workshop, distinct from workshop entity color
 */
export function getInstructorScheduleSlotDisplayColor(options: {
  entityType: ScheduleEntityType | string;
  recordId: string;
  sourceWorkshopId?: string | null;
}): string {
  if (options.sourceWorkshopId) {
    return hashToCategoryColor("mirror", options.sourceWorkshopId);
  }
  if (options.entityType === ENTITY_SCHEDULE_TYPE_WORKSHOP) {
    return hashToCategoryColor("workshop", options.recordId);
  }
  return hashToCategoryColor("instructor", options.recordId);
}

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

/** Instructor free; workshop or workshop-mirrored instructor → busy. */
export function resolveInstructorScheduleSlotType(options: {
  entityType: ScheduleEntityType | string;
  sourceWorkshopId?: string | null;
}): InstructorScheduleSlotType {
  if (options.sourceWorkshopId) {
    return "busy";
  }
  if (options.entityType === ENTITY_SCHEDULE_TYPE_WORKSHOP) {
    return "busy";
  }
  return "free";
}

export function todayIsoDateLocal(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const instructorScheduleSlotTimeFields = z
  .object({
    start_time: z
      .string()
      .trim()
      .regex(timePattern, { message: "Start time must use HH:mm format." }),
    end_time: z
      .string()
      .trim()
      .regex(timePattern, { message: "End time must use HH:mm format." }),
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

/** Client create payload — type and slot_date are set by parse/service. */
export const createInstructorScheduleSlotSchema = z
  .object({
    entity_type: z.enum(ENTITY_SCHEDULE_TYPE_VALUES, {
      message: "Entity type is required.",
    }),
    record_id: z.string().uuid({ message: "Please select an entity." }),
    name: z
      .string()
      .trim()
      .min(1, { message: "Name is required." })
      .max(SCHEDULE_SLOT_FIELD_LIMITS.name.max, {
        message: `Name must be at most ${SCHEDULE_SLOT_FIELD_LIMITS.name.max} characters.`,
      }),
    /** Optional: calendar/dup may send; form omits → server uses today. */
    slot_date: z
      .string()
      .trim()
      .regex(datePattern, { message: "Date must use YYYY-MM-DD format." })
      .optional(),
  })
  .and(instructorScheduleSlotTimeFields);

export const updateInstructorScheduleSlotSchema = z
  .object({
    id: z.string().uuid({ message: "Schedule slot id is required." }),
    entity_type: z.enum(ENTITY_SCHEDULE_TYPE_VALUES, {
      message: "Entity type is required.",
    }),
    record_id: z.string().uuid({ message: "Please select an entity." }),
    name: z
      .string()
      .trim()
      .min(1, { message: "Name is required." })
      .max(SCHEDULE_SLOT_FIELD_LIMITS.name.max, {
        message: `Name must be at most ${SCHEDULE_SLOT_FIELD_LIMITS.name.max} characters.`,
      }),
    type: z.enum(INSTRUCTOR_SCHEDULE_SLOT_TYPE_VALUES, {
      message: "Type is required.",
    }),
    slot_date: z
      .string()
      .trim()
      .regex(datePattern, { message: "Date must use YYYY-MM-DD format." }),
  })
  .and(instructorScheduleSlotTimeFields);

export const instructorScheduleSlotIdSchema = z.object({
  id: z.string().uuid({ message: "Schedule slot id is required." }),
});

export type CreateInstructorScheduleSlotFormInput = z.infer<
  typeof createInstructorScheduleSlotSchema
>;

export type CreateInstructorScheduleSlotInput =
  CreateInstructorScheduleSlotFormInput & {
    type: InstructorScheduleSlotType;
    slot_date: string;
  };

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

export function parseCreateInstructorScheduleSlotFormData(formData: FormData) {
  const rawSlotDate = formData.get("slot_date");
  const parsed = safeParseFormData(createInstructorScheduleSlotSchema, {
    entity_type: formData.get("entity_type"),
    record_id: formData.get("record_id"),
    name: formData.get("name"),
    slot_date:
      typeof rawSlotDate === "string" && rawSlotDate.trim() !== ""
        ? rawSlotDate
        : undefined,
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
  });

  if (!parsed.success) {
    return parsed;
  }

  const slot_date = parsed.data.slot_date ?? todayIsoDateLocal();
  const type = resolveInstructorScheduleSlotType({
    entityType: parsed.data.entity_type,
  });

  return {
    success: true as const,
    data: {
      ...parsed.data,
      type,
      slot_date,
    },
  };
}

export function parseUpdateInstructorScheduleSlotFormData(formData: FormData) {
  return safeParseFormData(updateInstructorScheduleSlotSchema, {
    id: formData.get("id"),
    entity_type: formData.get("entity_type"),
    record_id: formData.get("record_id"),
    name: formData.get("name"),
    type: formData.get("type"),
    slot_date: formData.get("slot_date"),
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
  });
}

export function parseInstructorScheduleSlotIdFormData(formData: FormData) {
  return safeParseFormData(instructorScheduleSlotIdSchema, {
    id: formData.get("id"),
  });
}

export { timeToMinutes };
