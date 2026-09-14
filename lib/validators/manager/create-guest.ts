import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";
import { AUTH_LIMITS } from "@/lib/constants/auth-limits";
import {
  GUEST_CURRENT_STATUSES,
  GUEST_DEFAULT_STATUS,
  GUEST_EDUCATION_LEVEL_VALUES,
  GUEST_INTERESTED_SERVICE_VALUES,
  GUEST_REFERRED_FROM,
  GUEST_REFERRED_FROM_OTHER_MAX,
  GUEST_REFERRED_FROM_VALUES,
} from "@/lib/constants/guest";

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

function refineReferredFromOther(
  data: {
    referred_from: string | null;
    referred_from_other: string | null;
  },
  ctx: z.RefinementCtx
) {
  if (
    data.referred_from === GUEST_REFERRED_FROM.OTHER &&
    !data.referred_from_other
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["referred_from_other"],
      message: "Enter how they were referred.",
    });
  }
}

function clearReferredFromOtherWhenNotOther<
  T extends {
    referred_from: string | null;
    referred_from_other: string | null;
  },
>(data: T): T {
  return {
    ...data,
    referred_from_other:
      data.referred_from === GUEST_REFERRED_FROM.OTHER
        ? data.referred_from_other
        : null,
  };
}

/** Shared intake fields for create and update (no profile status). */
export const guestIntakeFieldsSchema = z.object({
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
  referred_from: optionalEnum(
    GUEST_REFERRED_FROM_VALUES,
    "Select where they were referred from."
  ),
  referred_from_other: optionalTrimmedText(
    GUEST_REFERRED_FROM_OTHER_MAX,
    "Other referral source"
  ),
  notes: optionalTrimmedText(NOTES_MAX, "Notes"),
});

export {
  refineReferredFromOther,
  clearReferredFromOtherWhenNotOther,
};

export const createGuestSchema = guestIntakeFieldsSchema
  .extend({
    status: z
      .enum(
        [GUEST_CURRENT_STATUSES.SCHEDULED, GUEST_CURRENT_STATUSES.PENDING],
        { message: "Select Scheduled or Pending." }
      )
      .default(GUEST_DEFAULT_STATUS),
  })
  .superRefine(refineReferredFromOther)
  .transform(clearReferredFromOtherWhenNotOther);

export type CreateGuestInput = z.infer<typeof createGuestSchema>;

export function parseCreateGuestFormData(formData: FormData) {
  return safeParseFormData(createGuestSchema, {
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
    age: formData.get("age"),
    school_or_university: formData.get("school_or_university"),
    education_level: formData.get("education_level"),
    interested_service: formData.get("interested_service"),
    referred_from: formData.get("referred_from"),
    referred_from_other: formData.get("referred_from_other"),
    status: formData.get("status") || GUEST_DEFAULT_STATUS,
    notes: formData.get("notes"),
  });
}
