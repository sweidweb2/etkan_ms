import { z } from "zod";
import { MANAGER_CREATABLE_ROLES } from "@/lib/constants/manager-user-roles";
import {
  emailField,
  passwordField,
  usernameField,
} from "@/lib/validators/auth/fields";

export const createStaffUserSchema = z.object({
  username: usernameField,
  email: emailField,
  password: passwordField,
  role: z.enum(MANAGER_CREATABLE_ROLES, {
    message: "Please select a role.",
  }),
});

export type CreateStaffUserInput = z.infer<typeof createStaffUserSchema>;
