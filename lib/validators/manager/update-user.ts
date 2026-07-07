import { z } from "zod";
import { MANAGER_USER_EDITABLE_ROLES } from "@/lib/constants/manager-user-display";
import { emailField, usernameField } from "@/lib/validators/auth/fields";

export const updateManagerUserSchema = z.object({
  username: usernameField,
  email: emailField,
  role: z.enum(MANAGER_USER_EDITABLE_ROLES, {
    message: "Please select a role.",
  }),
});

export type UpdateManagerUserInput = z.infer<typeof updateManagerUserSchema>;
