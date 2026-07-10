import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const notificationIdSchema = z.object({
  id: z.string().uuid({ message: "Notification id is required." }),
});

export type NotificationIdInput = z.infer<typeof notificationIdSchema>;

export function parseNotificationIdFormData(formData: FormData):
  | { success: true; data: NotificationIdInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = notificationIdSchema.safeParse({
    id: formData.get("id"),
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
