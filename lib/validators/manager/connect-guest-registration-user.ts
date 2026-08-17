import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const connectGuestRegistrationUserSchema = z.object({
  guest_id: z.string().uuid({ message: "Invalid guest id." }),
  user_id: z.string().uuid({ message: "Select a user." }),
});

export type ConnectGuestRegistrationUserInput = z.infer<
  typeof connectGuestRegistrationUserSchema
>;

export function parseConnectGuestRegistrationUserFormData(formData: FormData):
  | { success: true; data: ConnectGuestRegistrationUserInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = connectGuestRegistrationUserSchema.safeParse({
    guest_id: formData.get("guest_id"),
    user_id: formData.get("user_id"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  return { success: true, data: parsed.data };
}
