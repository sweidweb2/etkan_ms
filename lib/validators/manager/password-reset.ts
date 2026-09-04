import { z } from "zod";
import { PASSWORD_RESET_BY_ROLE_VALUES } from "@/lib/constants/password-reset-roles";
import { passwordField } from "@/lib/validators/auth/fields";

export const resetPasswordsByRoleSchema = z.object({
  role: z.enum(PASSWORD_RESET_BY_ROLE_VALUES, {
    message: "Please select a valid role.",
  }),
});

export const resetUserPasswordSchema = z.object({
  userId: z.string().uuid({ message: "Please select a user." }),
  password: passwordField,
});

export type ResetPasswordsByRoleInput = z.infer<
  typeof resetPasswordsByRoleSchema
>;
export type ResetUserPasswordInput = z.infer<typeof resetUserPasswordSchema>;
