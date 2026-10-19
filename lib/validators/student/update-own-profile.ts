import { z } from "zod";
import {
  birthDateField,
  fullNameField,
  phoneField,
  usernameField,
} from "@/lib/validators/auth/fields";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import { formValidationFailure } from "@/lib/validators/safe-parse-form-data";
import type { FieldErrors } from "@/types/auth";

export const OWN_BIRTH_DATE_MIN = "1900-01-01";
export const OWN_BIRTH_DATE_TOO_EARLY_MESSAGE =
  "You cannot enter a birth date before 1900. Use 1900 or higher.";

const ownBirthDateField = birthDateField.refine(
  (value) => !value || value >= OWN_BIRTH_DATE_MIN,
  { message: OWN_BIRTH_DATE_TOO_EARLY_MESSAGE }
);

export const updateOwnStudentProfileSchema = z.object({
  username: usernameField,
  fullName: fullNameField,
  birthDate: ownBirthDateField,
  phone: phoneField,
});

export type UpdateOwnStudentProfileInput = z.infer<
  typeof updateOwnStudentProfileSchema
>;

export function parseUpdateOwnStudentProfileFormData(formData: FormData):
  | { success: true; data: UpdateOwnStudentProfileInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = updateOwnStudentProfileSchema.safeParse({
    username: formData.get("username"),
    fullName: formData.get("fullName"),
    birthDate: formData.get("birthDate"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return formValidationFailure(
      zodFieldErrors(parsed.error.flatten().fieldErrors)
    );
  }

  return { success: true, data: parsed.data };
}
