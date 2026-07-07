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
