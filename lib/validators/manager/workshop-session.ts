import { z } from "zod";
import { WORKSHOP_FIELD_LIMITS } from "@/lib/constants/workshop-field-limits";
import {
  WORKSHOP_SESSION_STATUS_VALUES,
} from "@/lib/constants/manager-workshop-display";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

const TIME_HH_MM = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

function optionalTrimmedString(max: number, message: string) {
  return z.preprocess((value) => {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = String(value).trim();
    return trimmed === "" ? null : trimmed;
  }, z.string().max(max, { message }).nullable());
}

function optionalEval(fieldLabel: string) {
  return z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return null;
    }
    return value;
  }, z.coerce
    .number()
    .int({ message: `${fieldLabel} must be a whole number.` })
    .min(1, { message: `${fieldLabel} must be between 1 and 10.` })
    .max(10, { message: `${fieldLabel} must be between 1 and 10.` })
    .nullable());
}

function optionalPositiveInt(message: string) {
  return z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return null;
    }
    return value;
  }, z.coerce
    .number()
    .int({ message: "Must be a whole number." })
    .min(1, { message })
    .nullable());
}

export function normalizeWorkshopSessionTime(value: string): string {
  const match = value.trim().match(TIME_HH_MM);
  if (!match) {
    return value.trim();
  }
  const hours = match[1];
  const minutes = match[2];
  return `${hours}:${minutes}:00`;
}

function timeToMinutes(value: string): number | null {
  const match = value.match(TIME_HH_MM);
  if (!match) {
    return null;
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

export function hoursFromWorkshopSessionTimes(
  start: string,
  end: string
): number | null {
  const startMinutes = timeToMinutes(normalizeWorkshopSessionTime(start));
  const endMinutes = timeToMinutes(normalizeWorkshopSessionTime(end));
  if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) {
    return null;
  }
  return Math.round(((endMinutes - startMinutes) / 60) * 100) / 100;
}

function normalizeTime(value: string): string {
  return normalizeWorkshopSessionTime(value);
}

const sharedSessionFields = {
  session_date: z
    .string()
    .trim()
    .min(1, { message: "Session date is required." })
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: "Session date must be YYYY-MM-DD.",
    }),
  start_time: z
    .string()
    .trim()
    .min(1, { message: "Start time is required." })
    .regex(TIME_HH_MM, { message: "Start time must be HH:MM." }),
  end_time: z
    .string()
    .trim()
    .min(1, { message: "End time is required." })
    .regex(TIME_HH_MM, { message: "End time must be HH:MM." }),
  nb_hours: z.coerce
    .number()
    .positive({ message: "Hours must be greater than zero." })
    .max(WORKSHOP_FIELD_LIMITS.session_hours.max, {
      message: `Hours must be at most ${WORKSHOP_FIELD_LIMITS.session_hours.max}.`,
    }),
  topic: z
    .string()
    .trim()
    .min(1, { message: "Topic is required." })
    .max(WORKSHOP_FIELD_LIMITS.session_topic.max, {
      message: `Topic must be at most ${WORKSHOP_FIELD_LIMITS.session_topic.max} characters.`,
    }),
  notes: optionalTrimmedString(
    WORKSHOP_FIELD_LIMITS.session_notes.max,
    `Notes must be at most ${WORKSHOP_FIELD_LIMITS.session_notes.max} characters.`
  ),
  suggestions: optionalTrimmedString(
    WORKSHOP_FIELD_LIMITS.session_suggestions.max,
    `Suggestions must be at most ${WORKSHOP_FIELD_LIMITS.session_suggestions.max} characters.`
  ),
  status: z.enum(WORKSHOP_SESSION_STATUS_VALUES, {
    message: "Select planned or done.",
  }),
  participants_eval: optionalEval("Participants evaluation"),
  session_eval: optionalEval("Session evaluation"),
  nb_order: optionalPositiveInt("Session order must be at least 1."),
};

function withEndAfterStartRefine<
  T extends z.ZodObject<z.ZodRawShape>,
>(schema: T) {
  return schema.superRefine((raw, ctx) => {
    const data = raw as { start_time?: string; end_time?: string };
    if (!data.start_time || !data.end_time) {
      return;
    }
    const startMinutes = timeToMinutes(normalizeTime(data.start_time));
    const endMinutes = timeToMinutes(normalizeTime(data.end_time));
    if (
      startMinutes != null &&
      endMinutes != null &&
      endMinutes <= startMinutes
    ) {
      ctx.addIssue({
        code: "custom",
        message: "End time must be after start time.",
        path: ["end_time"],
      });
    }
  });
}

/** Client form schema (hours required; dialogs auto-fill from times). */
export const createWorkshopSessionFormSchema = withEndAfterStartRefine(
  z.object({
    workshop_id: z.string().uuid({ message: "Workshop is required." }),
    ...sharedSessionFields,
  })
);

export const updateWorkshopSessionFormSchema = withEndAfterStartRefine(
  z.object({
    id: z.string().uuid({ message: "Session is required." }),
    workshop_id: z.string().uuid({ message: "Workshop is required." }),
    ...sharedSessionFields,
  })
);

export const createWorkshopSessionSchema = createWorkshopSessionFormSchema.transform(
  (data) => ({
    ...data,
    start_time: normalizeTime(data.start_time),
    end_time: normalizeTime(data.end_time),
  })
);

export type CreateWorkshopSessionInput = z.infer<
  typeof createWorkshopSessionSchema
>;

export const updateWorkshopSessionSchema = updateWorkshopSessionFormSchema.transform(
  (data) => ({
    ...data,
    start_time: normalizeTime(data.start_time),
    end_time: normalizeTime(data.end_time),
  })
);

export type UpdateWorkshopSessionInput = z.infer<
  typeof updateWorkshopSessionSchema
>;

export const deleteWorkshopSessionSchema = z.object({
  id: z.string().uuid({ message: "Session is required." }),
  workshop_id: z.string().uuid({ message: "Workshop is required." }),
});

export type DeleteWorkshopSessionInput = z.infer<
  typeof deleteWorkshopSessionSchema
>;

export function parseCreateWorkshopSessionFormData(formData: FormData):
  | { success: true; data: CreateWorkshopSessionInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = createWorkshopSessionSchema.safeParse({
    workshop_id: formData.get("workshop_id"),
    nb_order: formData.get("nb_order"),
    session_date: formData.get("session_date"),
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
    nb_hours: formData.get("nb_hours"),
    topic: formData.get("topic"),
    notes: formData.get("notes"),
    suggestions: formData.get("suggestions"),
    status: formData.get("status"),
    participants_eval: formData.get("participants_eval"),
    session_eval: formData.get("session_eval"),
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

export function parseUpdateWorkshopSessionFormData(formData: FormData):
  | { success: true; data: UpdateWorkshopSessionInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = updateWorkshopSessionSchema.safeParse({
    id: formData.get("id"),
    workshop_id: formData.get("workshop_id"),
    nb_order: formData.get("nb_order"),
    session_date: formData.get("session_date"),
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
    nb_hours: formData.get("nb_hours"),
    topic: formData.get("topic"),
    notes: formData.get("notes"),
    suggestions: formData.get("suggestions"),
    status: formData.get("status"),
    participants_eval: formData.get("participants_eval"),
    session_eval: formData.get("session_eval"),
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

export function parseDeleteWorkshopSessionFormData(formData: FormData):
  | { success: true; data: DeleteWorkshopSessionInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = deleteWorkshopSessionSchema.safeParse({
    id: formData.get("id"),
    workshop_id: formData.get("workshop_id"),
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
