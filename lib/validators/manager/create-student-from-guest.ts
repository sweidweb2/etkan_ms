import { z } from "zod";
import {
  AUTH_LIMITS,
  DEFAULT_CREATED_STUDENT_PASSWORD,
} from "@/lib/constants/auth-limits";
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

const optionalPasswordInput = z
  .string()
  .max(AUTH_LIMITS.password.max, {
    message: `Password must be at most ${AUTH_LIMITS.password.max} characters.`,
  })
  .optional()
  .or(z.literal(""));

function parseBooleanFormValue(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === "1";
}

export const createStudentFromGuestSchema = z
  .object({
    guest_id: z.string().uuid({ message: "Invalid guest id." }),
    username: usernameField,
    fullName: fullNameField,
    email: emailField,
    password: optionalPasswordInput,
    confirmPassword: optionalPasswordInput,
    birthDate: birthDateField,
    phone: phoneField,
    markGuestAsFinished: z.preprocess(parseBooleanFormValue, z.boolean()),
  })
  .superRefine((data, ctx) => {
    const password = data.password ?? "";
    const confirmPassword = data.confirmPassword ?? "";
    if (password === "" && confirmPassword === "") {
      return;
    }

    if (password !== confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match.",
        path: ["confirmPassword"],
      });
    }

    const parsedPassword = passwordField.safeParse(password);
    if (!parsedPassword.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: parsedPassword.error.issues[0]?.message ?? "Invalid password.",
        path: ["password"],
      });
    }
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
  const password =
    (data.password ?? "") === "" && (data.confirmPassword ?? "") === ""
      ? DEFAULT_CREATED_STUDENT_PASSWORD
      : (data.password ?? "");

  return {
    guest_id: data.guest_id,
    username: data.username,
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
    username: formData.get("username"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password") ?? "",
    confirmPassword: formData.get("confirmPassword") ?? "",
    birthDate: formData.get("birthDate"),
    phone: formData.get("phone"),
    markGuestAsFinished: formData.get("markGuestAsFinished"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  return { success: true, data: resolveCreateStudentFromGuestInput(parsed.data) };
}
