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

export const loginSchema = z.object({
  email: emailField,
  password: passwordField,
});

export const signupSchema = z
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

export const changePasswordSchema = z
  .object({
    newPassword: passwordField,
    confirmPassword: z
      .string()
      .min(1, { message: "Please confirm your password." })
      .max(AUTH_LIMITS.password.max, {
        message: `Password must be at most ${AUTH_LIMITS.password.max} characters.`,
      }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
