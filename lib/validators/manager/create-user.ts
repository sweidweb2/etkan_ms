import { z } from "zod";
import { MANAGER_CREATABLE_ROLES } from "@/lib/constants/manager-user-roles";
import { emailField, usernameField } from "@/lib/validators/auth/fields";
import {
  addOptionalPasswordIssues,
  optionalPasswordInput,
  resolveCreatedAccountPassword,
} from "@/lib/validators/auth/optional-created-password";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const createStaffUserSchema = z
  .object({
    username: usernameField,
    email: emailField,
    password: optionalPasswordInput,
    role: z.enum(MANAGER_CREATABLE_ROLES, {
      message: "Please select a role.",
    }),
    is_instructor: z.boolean(),
  })
  .superRefine((data, ctx) => {
    addOptionalPasswordIssues(data.password, ctx);
  });

export type CreateStaffUserFormInput = z.infer<typeof createStaffUserSchema>;

export type CreateStaffUserInput = Omit<CreateStaffUserFormInput, "password"> & {
  password: string;
};

export function resolveCreateStaffUserInput(
  data: CreateStaffUserFormInput
): CreateStaffUserInput {
  return {
    username: data.username,
    email: data.email,
    password: resolveCreatedAccountPassword(data.password),
    role: data.role,
    is_instructor: data.is_instructor,
  };
}

export function parseCreateStaffUserFormData(formData: FormData):
  | { success: true; data: CreateStaffUserInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = createStaffUserSchema.safeParse({
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password") ?? "",
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

  return { success: true, data: resolveCreateStaffUserInput(parsed.data) };
}
