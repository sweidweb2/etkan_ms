import { z } from "zod";
import { MANAGER_CREATABLE_ROLES } from "@/lib/constants/manager-user-roles";
import {
  emailField,
  passwordField,
  usernameField,
} from "@/lib/validators/auth/fields";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const createStaffUserSchema = z.object({
  username: usernameField,
  email: emailField,
  password: passwordField,
  role: z.enum(MANAGER_CREATABLE_ROLES, {
    message: "Please select a role.",
  }),
  is_instructor: z.boolean(),
});

export type CreateStaffUserInput = z.infer<typeof createStaffUserSchema>;

export function parseCreateStaffUserFormData(formData: FormData):
  | { success: true; data: CreateStaffUserInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = createStaffUserSchema.safeParse({
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    is_instructor: formData.get("is_instructor") === "true",
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
