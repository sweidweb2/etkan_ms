import { z } from "zod";
import { AUTH_LIMITS } from "@/lib/constants/auth-limits";
import {
  birthDateField,
  emailField,
  fullNameField,
  passwordField,
  phoneField,
  usernameField,
} from "@/lib/validators/auth/fields";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const createStudentSchema = z
  .object({
    username: usernameField,
    fullName: fullNameField,
    email: emailField,
    password: passwordField,
    confirmPassword: z
      .string()
      .min(1, { message: "Please confirm your password." })
      .max(AUTH_LIMITS.password.max, {
        message: `Password must be at most ${AUTH_LIMITS.password.max} characters.`,
      }),
    birthDate: birthDateField,
    phone: phoneField,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type CreateStudentInput = z.infer<typeof createStudentSchema>;

export function parseCreateStudentFormData(formData: FormData):
  | { success: true; data: CreateStudentInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = createStudentSchema.safeParse({
    username: formData.get("username"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    birthDate: formData.get("birthDate"),
    phone: formData.get("phone"),
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
