import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

export const connectGuestRegistrationUserSchema = z.object({
  guest_id: z.string().uuid({ message: "Invalid guest id." }),
  user_id: z.string().uuid({ message: "Select a user." }),
});

export type ConnectGuestRegistrationUserInput = z.infer<
  typeof connectGuestRegistrationUserSchema
>;

export function parseConnectGuestRegistrationUserFormData(formData: FormData) {
  return safeParseFormData(connectGuestRegistrationUserSchema, {
    guest_id: formData.get("guest_id"),
    user_id: formData.get("user_id"),
  });
}
