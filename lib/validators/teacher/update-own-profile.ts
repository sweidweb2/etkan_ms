import { z } from "zod";
import {
  emailField,
  fullNameField,
  usernameField,
} from "@/lib/validators/auth/fields";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import { formValidationFailure } from "@/lib/validators/safe-parse-form-data";
import type { FieldErrors } from "@/types/auth";

export const updateOwnTeacherProfileSchema = z.object({
  fullName: fullNameField,
  username: usernameField,
  email: emailField,
});

export type UpdateOwnTeacherProfileInput = z.infer<
  typeof updateOwnTeacherProfileSchema
>;

export function parseUpdateOwnTeacherProfileFormData(formData: FormData):
  | { success: true; data: UpdateOwnTeacherProfileInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = updateOwnTeacherProfileSchema.safeParse({
    fullName: formData.get("fullName"),
    username: formData.get("username"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return formValidationFailure(
      zodFieldErrors(parsed.error.flatten().fieldErrors)
    );
  }

  return { success: true, data: parsed.data };
}
