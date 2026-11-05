import { z } from "zod";
import { formValidationFailure } from "@/lib/validators/safe-parse-form-data";
import {
  birthDateField,
  emailField,
  fullNameField,
  phoneField,
} from "@/lib/validators/auth/fields";
import {
  addOptionalPasswordPairIssues,
  optionalPasswordInput,
  resolveCreatedAccountPassword,
} from "@/lib/validators/auth/optional-created-password";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

function parseBooleanFormValue(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === "1";
}

export const createStudentFromGuestSchema = z
  .object({
    guest_id: z.string().uuid({ message: "Invalid guest id." }),
    fullName: fullNameField,
    email: emailField,
    password: optionalPasswordInput,
    confirmPassword: optionalPasswordInput,
    birthDate: birthDateField,
    phone: phoneField,
    markGuestAsFinished: z.preprocess(parseBooleanFormValue, z.boolean()),
  })
  .superRefine((data, ctx) => {
    addOptionalPasswordPairIssues(data, ctx);
  });

export type CreateStudentFromGuestFormInput = z.infer<
  typeof createStudentFromGuestSchema
>;

export type CreateStudentFromGuestInput = Omit<
  CreateStudentFromGuestFormInput,
  "password" | "confirmPassword" | "markGuestAsFinished"
> & {
  password: string;
  confirmPassword: string;
  markGuestAsFinished: boolean;
};

export function resolveCreateStudentFromGuestInput(
  data: CreateStudentFromGuestFormInput
): CreateStudentFromGuestInput {
  const password = resolveCreatedAccountPassword(
    data.password,
    data.confirmPassword
  );

  return {
    guest_id: data.guest_id,
    fullName: data.fullName,
    email: data.email,
    password,
    confirmPassword: password,
    birthDate: data.birthDate,
    phone: data.phone,
    markGuestAsFinished: Boolean(data.markGuestAsFinished),
  };
}

export function parseCreateStudentFromGuestFormData(formData: FormData):
  | { success: true; data: CreateStudentFromGuestInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = createStudentFromGuestSchema.safeParse({
    guest_id: formData.get("guest_id"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password") ?? "",
    confirmPassword: formData.get("confirmPassword") ?? "",
    birthDate: formData.get("birthDate"),
    phone: formData.get("phone"),
    markGuestAsFinished: formData.get("markGuestAsFinished"),
  });

  if (!parsed.success) {
    return formValidationFailure(zodFieldErrors(parsed.error.flatten().fieldErrors));
  }

  return { success: true, data: resolveCreateStudentFromGuestInput(parsed.data) };
}
