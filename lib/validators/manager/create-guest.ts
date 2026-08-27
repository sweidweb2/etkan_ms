import { z } from "zod";
import { AUTH_LIMITS } from "@/lib/constants/auth-limits";
import {
  GUEST_CURRENT_STATUSES,
  GUEST_DEFAULT_STATUS,
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

function optionalEnum<T extends readonly [string, ...string[]]>(
  values: T,
  message: string
) {
  return z.preprocess((value) => {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = String(value).trim();
    return trimmed === "" ? null : trimmed;
  }, z.enum(values, { message }).nullable());
}

const optionalAge = z.preprocess((value) => {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = String(value).trim();
  if (trimmed === "") {
    return null;
  }
  return value;
}, z.coerce
  .number({ message: "Age must be a number." })
  .int({ message: "Age must be a whole number." })
  .positive({ message: "Age must be greater than 0." })
  .max(120, { message: "Age must be at most 120." })
  .nullable());

export const createGuestSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, { message: "Name is required." })
    .max(FULL_NAME_MAX, {
      message: `Name must be at most ${FULL_NAME_MAX} characters.`,
    }),
  phone: optionalTrimmedText(AUTH_LIMITS.phone.max, "Phone"),
  age: optionalAge,
  school_or_university: optionalTrimmedText(SCHOOL_MAX, "School / university"),
  education_level: optionalEnum(
    GUEST_EDUCATION_LEVEL_VALUES,
    "Select an education level."
  ),
  interested_service: optionalEnum(
    GUEST_INTERESTED_SERVICE_VALUES,
    "Select an interested service."
  ),
  status: z
    .enum(
      [GUEST_CURRENT_STATUSES.SCHEDULED, GUEST_CURRENT_STATUSES.PENDING],
      { message: "Select Scheduled or Pending." }
    )
    .default(GUEST_DEFAULT_STATUS),
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
    status: formData.get("status") || GUEST_DEFAULT_STATUS,
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
