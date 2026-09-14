import { z } from "zod";
import { formValidationFailure } from "@/lib/validators/safe-parse-form-data";
import {
  birthDateField,
  emailField,
  fullNameField,
  phoneField,
  usernameField,
} from "@/lib/validators/auth/fields";
import {
  addOptionalPasswordPairIssues,
  optionalPasswordInput,
  resolveCreatedAccountPassword,
} from "@/lib/validators/auth/optional-created-password";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const createStudentSchema = z
  .object({
    username: usernameField,
    fullName: fullNameField,
    email: emailField,
    password: optionalPasswordInput,
    confirmPassword: optionalPasswordInput,
    birthDate: birthDateField,
    phone: phoneField,
  })
  .superRefine((data, ctx) => {
    addOptionalPasswordPairIssues(data, ctx);
  });

export type CreateStudentFormInput = z.infer<typeof createStudentSchema>;

export type CreateStudentInput = Omit<
  CreateStudentFormInput,
  "password" | "confirmPassword"
> & {
  password: string;
  confirmPassword: string;
};

export function resolveCreateStudentInput(
  data: CreateStudentFormInput
): CreateStudentInput {
  const password = resolveCreatedAccountPassword(
    data.password,
    data.confirmPassword
  );

  return {
    username: data.username,
    fullName: data.fullName,
    email: data.email,
    password,
    confirmPassword: password,
    birthDate: data.birthDate,
    phone: data.phone,
  };
}

export function parseCreateStudentFormData(formData: FormData):
  | { success: true; data: CreateStudentInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = createStudentSchema.safeParse({
    username: formData.get("username"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password") ?? "",
    confirmPassword: formData.get("confirmPassword") ?? "",
    birthDate: formData.get("birthDate"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return formValidationFailure(zodFieldErrors(parsed.error.flatten().fieldErrors));
  }

  return { success: true, data: resolveCreateStudentInput(parsed.data) };
}
