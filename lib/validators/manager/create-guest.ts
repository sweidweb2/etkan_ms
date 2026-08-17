import { z } from "zod";
import { AUTH_LIMITS } from "@/lib/constants/auth-limits";
import {
  GUEST_EDUCATION_LEVEL_VALUES,
  GUEST_INTERESTED_SERVICE_VALUES,
} from "@/lib/constants/guest";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

const FULL_NAME_MAX = AUTH_LIMITS.fullName.max;
const NOTES_MAX = 2000;
const SCHOOL_MAX = 200;

function optionalTrimmedText(max: number, label: string) {
  return z.preprocess((value) => {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = String(value).trim();
    return trimmed === "" ? null : trimmed;
  }, z
    .string()
    .max(max, { message: `${label} must be at most ${max} characters.` })
    .nullable());
}

export const createGuestSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, { message: "Name is required." })
    .max(FULL_NAME_MAX, {
      message: `Name must be at most ${FULL_NAME_MAX} characters.`,
    }),
  phone: z
    .string()
    .trim()
    .min(1, { message: "Phone is required." })
    .max(AUTH_LIMITS.phone.max, {
      message: `Phone must be at most ${AUTH_LIMITS.phone.max} characters.`,
    }),
  age: z.coerce
    .number({ message: "Age is required." })
    .int({ message: "Age must be a whole number." })
    .positive({ message: "Age must be greater than 0." })
    .max(120, { message: "Age must be at most 120." }),
  school_or_university: optionalTrimmedText(SCHOOL_MAX, "School / university"),
  education_level: z.enum(GUEST_EDUCATION_LEVEL_VALUES, {
    message: "Select an education level.",
  }),
  interested_service: z.enum(GUEST_INTERESTED_SERVICE_VALUES, {
    message: "Select an interested service.",
  }),
  notes: optionalTrimmedText(NOTES_MAX, "Notes"),
});

export type CreateGuestInput = z.infer<typeof createGuestSchema>;

export function parseCreateGuestFormData(formData: FormData):
  | { success: true; data: CreateGuestInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = createGuestSchema.safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
    age: formData.get("age"),
    school_or_university: formData.get("school_or_university"),
    education_level: formData.get("education_level"),
    interested_service: formData.get("interested_service"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(flattened),
    };
  }

  return { success: true, data: parsed.data };
}
