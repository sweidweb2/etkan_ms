import { z } from "zod";
import { AUTH_LIMITS } from "@/lib/constants/auth-limits";
import { passwordField } from "@/lib/validators/auth/fields";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import { formValidationFailure } from "@/lib/validators/safe-parse-form-data";
import type { FieldErrors } from "@/types/auth";

export const changeOwnPasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, { message: "Old password is required." })
      .max(AUTH_LIMITS.password.max, {
        message: `Password must be at most ${AUTH_LIMITS.password.max} characters.`,
      }),
    newPassword: passwordField,
    confirmPassword: z
      .string()
      .min(1, { message: "Please confirm your new password." })
      .max(AUTH_LIMITS.password.max, {
        message: `Password must be at most ${AUTH_LIMITS.password.max} characters.`,
      }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from the old password.",
    path: ["newPassword"],
  });

export type ChangeOwnPasswordInput = z.infer<typeof changeOwnPasswordSchema>;

export function parseChangeOwnPasswordFormData(formData: FormData):
  | { success: true; data: ChangeOwnPasswordInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = changeOwnPasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return formValidationFailure(
      zodFieldErrors(parsed.error.flatten().fieldErrors)
    );
  }

  return { success: true, data: parsed.data };
}
